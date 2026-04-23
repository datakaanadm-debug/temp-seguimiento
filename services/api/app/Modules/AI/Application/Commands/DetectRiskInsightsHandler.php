<?php

declare(strict_types=1);

namespace App\Modules\AI\Application\Commands;

use App\Modules\AI\Application\Contracts\LlmRequest;
use App\Modules\AI\Application\Services\LlmGateway;
use App\Modules\AI\Application\Services\PromptLibrary;
use App\Modules\AI\Domain\AiInsight;
use App\Modules\AI\Domain\Enums\InsightKind;
use App\Modules\AI\Domain\Enums\InsightSeverity;
use App\Modules\AI\Domain\Enums\LlmModel;
use App\Modules\AI\Domain\Events\InsightDetected;
use App\Modules\Identity\Domain\User;
use Illuminate\Support\Facades\DB;

/**
 * Corre contra un user: agrega actividad reciente, pasa a LLM con prompt estructurado,
 * parsea JSON de vuelta, persiste insights activos.
 *
 * Idempotencia: antes de crear un insight nuevo, verifica que no haya uno activo
 * del mismo kind para el mismo subject en las últimas 48h.
 *
 * @return list<AiInsight>
 */
final class DetectRiskInsightsHandler
{
    public function __construct(
        private readonly LlmGateway $llm,
        private readonly PromptLibrary $prompts,
    ) {}

    public function handle(DetectRiskInsights $command): array
    {
        /** @var User $user */
        $user = User::query()->findOrFail($command->userId);
        $activity = $this->gatherActivity($user->id);

        if ($this->hasInsufficientData($activity)) {
            return [];
        }

        $response = $this->llm->call(
            request: new LlmRequest(
                model: LlmModel::ClaudeHaiku,     // clasificación → Haiku es más barato
                systemPrompt: $this->prompts->riskInsightsV1(),
                messages: [['role' => 'user', 'content' => json_encode($activity, JSON_UNESCAPED_UNICODE)]],
                maxTokens: 1200,
                temperature: 0.2,
                metadata: ['kind' => 'risk_insights', 'subject_id' => $user->id],
            ),
            cacheKeyHint: $user->id,
            cacheTtlSeconds: 3600 * 6,  // 6h: insights se re-detectan al menos 4 veces al día
        );

        $parsed = $this->parseJson($response->content);
        $created = [];

        DB::transaction(function () use ($user, $parsed, &$created) {
            foreach (($parsed['insights'] ?? []) as $row) {
                $kind = $this->safeKind($row['kind'] ?? null);
                $severity = $this->safeSeverity($row['severity'] ?? null);
                if (!$kind || !$severity) {
                    continue;
                }
                if (($row['confidence'] ?? 0) < 0.6) {
                    continue;
                }
                if ($this->hasActiveSimilar($user->id, $kind)) {
                    continue;
                }

                $insight = AiInsight::create([
                    'subject_type' => User::class,
                    'subject_id' => $user->id,
                    'kind' => $kind->value,
                    'severity' => $severity->value,
                    'title' => (string) ($row['title'] ?? ''),
                    'description' => (string) ($row['description'] ?? ''),
                    'evidence' => is_array($row['evidence'] ?? null) ? $row['evidence'] : null,
                    'confidence' => (float) $row['confidence'],
                ]);
                $created[] = $insight;

                DB::afterCommit(fn () => event(new InsightDetected($insight)));
            }
        });

        return $created;
    }

    /** @return array<string, mixed> */
    private function gatherActivity(string $userId): array
    {
        $from = now()->subDays(14);

        return [
            'user_id' => $userId,
            'ventana_dias' => 14,
            'tareas_completadas' => DB::table('tasks')
                ->where('assignee_id', $userId)
                ->where('state', 'DONE')
                ->whereBetween('completed_at', [$from, now()])
                ->count(),
            'tareas_activas' => DB::table('tasks')
                ->where('assignee_id', $userId)
                ->whereNotIn('state', ['DONE', 'CANCELLED'])
                ->count(),
            'tareas_vencidas' => DB::table('tasks')
                ->where('assignee_id', $userId)
                ->whereNotIn('state', ['DONE', 'CANCELLED'])
                ->whereNotNull('due_at')
                ->where('due_at', '<', now())
                ->count(),
            'daily_reports' => DB::table('daily_reports')
                ->where('user_id', $userId)
                ->whereBetween('report_date', [$from->toDateString(), now()->toDateString()])
                ->count(),
            'dias_esperados_reporte' => 14,
            'blockers_abiertos' => DB::table('blockers')
                ->where('raised_by', $userId)
                ->whereIn('status', ['open', 'acknowledged'])
                ->count(),
            'blockers_resueltos' => DB::table('blockers')
                ->where('raised_by', $userId)
                ->where('status', 'resolved')
                ->whereBetween('resolved_at', [$from, now()])
                ->count(),
            'horas_loggeadas' => (int) DB::table('time_entries')
                ->where('user_id', $userId)
                ->whereNotNull('ended_at')
                ->whereBetween('started_at', [$from, now()])
                ->sum('duration_minutes'),
        ];
    }

    private function hasInsufficientData(array $activity): bool
    {
        $totalSignals = ($activity['tareas_completadas'] ?? 0)
            + ($activity['tareas_activas'] ?? 0)
            + ($activity['daily_reports'] ?? 0)
            + ($activity['blockers_abiertos'] ?? 0);
        return $totalSignals === 0;
    }

    private function parseJson(string $raw): array
    {
        // El LLM puede devolver JSON envuelto en ```json ... ```
        $raw = preg_replace('/^```(?:json)?\s*|\s*```$/m', '', trim($raw));
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function safeKind(?string $raw): ?InsightKind
    {
        return $raw ? InsightKind::tryFrom($raw) : null;
    }

    private function safeSeverity(?string $raw): ?InsightSeverity
    {
        return $raw ? InsightSeverity::tryFrom($raw) : null;
    }

    private function hasActiveSimilar(string $userId, InsightKind $kind): bool
    {
        return AiInsight::query()
            ->where('subject_type', User::class)
            ->where('subject_id', $userId)
            ->where('kind', $kind->value)
            ->active()
            ->where('created_at', '>', now()->subHours(48))
            ->exists();
    }
}
