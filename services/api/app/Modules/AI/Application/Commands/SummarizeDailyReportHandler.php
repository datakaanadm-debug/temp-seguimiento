<?php

declare(strict_types=1);

namespace App\Modules\AI\Application\Commands;

use App\Modules\AI\Application\Contracts\LlmRequest;
use App\Modules\AI\Application\Services\LlmGateway;
use App\Modules\AI\Application\Services\PromptLibrary;
use App\Modules\AI\Domain\AiSummary;
use App\Modules\AI\Domain\Enums\LlmModel;
use App\Modules\AI\Domain\Enums\SummaryKind;
use App\Modules\AI\Domain\Events\SummaryGenerated;
use App\Modules\Tracking\Domain\DailyReport;
use Illuminate\Support\Facades\DB;

/**
 * Genera un resumen narrativo del reporte diario y actualiza la referencia en `daily_reports.ai_summary_id`.
 */
final class SummarizeDailyReportHandler
{
    public function __construct(
        private readonly LlmGateway $llm,
        private readonly PromptLibrary $prompts,
    ) {}

    public function handle(SummarizeDailyReport $command): ?AiSummary
    {
        /** @var DailyReport $report */
        $report = DailyReport::query()->findOrFail($command->dailyReportId);

        // Si ya hay un summary aprobado, no regenerar
        if ($report->ai_summary_id) {
            return AiSummary::query()->find($report->ai_summary_id);
        }

        $userMessage = $this->buildUserMessage($report);

        $response = $this->llm->call(
            request: new LlmRequest(
                model: LlmModel::ClaudeSonnet,
                systemPrompt: $this->prompts->dailySummaryV1(),
                messages: [['role' => 'user', 'content' => $userMessage]],
                maxTokens: 600,
                temperature: 0.5,
                metadata: ['kind' => 'daily_summary', 'subject_id' => $report->id],
            ),
            cacheKeyHint: $report->id . ':' . $report->updated_at?->timestamp,
            cacheTtlSeconds: 86_400 * 30,  // 30 días — el reporte es inmutable una vez submitted
        );

        if (str_contains($response->content, 'REPORTE_INSUFICIENTE')) {
            return null;
        }

        return DB::transaction(function () use ($report, $response) {
            $summary = AiSummary::create([
                'subject_type' => DailyReport::class,
                'subject_id' => $report->id,
                'kind' => SummaryKind::Daily->value,
                'model' => $response->model->value,
                'prompt_tokens' => $response->promptTokens,
                'completion_tokens' => $response->completionTokens,
                'cost_usd' => $response->costUsd,
                'content' => $response->content,
                'created_at' => now(),
            ]);

            DB::table('daily_reports')
                ->where('id', $report->id)
                ->update(['ai_summary_id' => $summary->id, 'updated_at' => now()]);

            DB::afterCommit(fn () => event(new SummaryGenerated($summary)));

            return $summary;
        });
    }

    private function buildUserMessage(DailyReport $report): string
    {
        $payload = [
            'fecha' => $report->report_date->toDateString(),
            'avances' => $report->progress_summary,
            'bloqueos' => $report->blockers_text,
            'plan_manana' => $report->plan_tomorrow,
            'estado_emocional' => $report->mood?->value,
            'horas_trabajadas' => $report->hours_worked ? (float) $report->hours_worked : null,
        ];
        return "Reporte diario:\n```json\n" . json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n```";
    }
}
