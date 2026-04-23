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
use App\Modules\Performance\Application\Services\KpiComputation;
use App\Modules\Performance\Domain\Evaluation;
use Illuminate\Support\Facades\DB;

/**
 * Genera un borrador narrativo para una evaluación (guarda en AiSummary + actualiza
 * `evaluations.ai_draft_narrative`). El evaluator valida y edita antes de submit.
 */
final class GenerateEvaluationNarrativeHandler
{
    public function __construct(
        private readonly LlmGateway $llm,
        private readonly PromptLibrary $prompts,
        private readonly KpiComputation $kpi,
    ) {}

    public function handle(GenerateEvaluationNarrative $command): AiSummary
    {
        /** @var Evaluation $evaluation */
        $evaluation = Evaluation::query()
            ->with(['subject', 'scorecard.metrics', 'responses.metric'])
            ->findOrFail($command->evaluationId);

        $userMessage = $this->buildUserMessage($evaluation);

        $response = $this->llm->call(
            request: new LlmRequest(
                model: LlmModel::ClaudeSonnet,
                systemPrompt: $this->prompts->evaluationNarrativeV1(),
                messages: [['role' => 'user', 'content' => $userMessage]],
                maxTokens: 1800,
                temperature: 0.6,
                metadata: ['kind' => 'evaluation_narrative', 'subject_id' => $evaluation->id],
            ),
            cacheKeyHint: $evaluation->id . ':' . $evaluation->updated_at?->timestamp,
            cacheTtlSeconds: 86_400 * 7,
        );

        return DB::transaction(function () use ($evaluation, $response) {
            $summary = AiSummary::create([
                'subject_type' => Evaluation::class,
                'subject_id' => $evaluation->id,
                'kind' => SummaryKind::Evaluation->value,
                'model' => $response->model->value,
                'prompt_tokens' => $response->promptTokens,
                'completion_tokens' => $response->completionTokens,
                'cost_usd' => $response->costUsd,
                'content' => $response->content,
                'created_at' => now(),
            ]);

            $evaluation->ai_draft_narrative = $response->content;
            $evaluation->save();

            DB::afterCommit(fn () => event(new SummaryGenerated($summary)));

            return $summary;
        });
    }

    private function buildUserMessage(Evaluation $evaluation): string
    {
        $periodStart = now()->subDays($this->periodDays($evaluation));
        $periodEnd = now();

        $kpis = $this->kpi->computeAllForScorecard(
            scorecardId: $evaluation->scorecard_id,
            subjectUserId: $evaluation->subject_user_id,
            from: $periodStart,
            to: $periodEnd,
        );

        $responses = $evaluation->responses->map(fn ($r) => [
            'metric' => $r->metric?->label,
            'type' => $r->metric?->type->value,
            'value' => $r->value_numeric ?? $r->value_text,
            'auto_value' => $r->auto_value,
        ])->all();

        $payload = [
            'practicante' => [
                'nombre' => $evaluation->subject->name,
                'puesto' => null, // se puede cargar desde profile si se requiere
            ],
            'evaluacion' => [
                'tipo' => $evaluation->kind->value,
                'periodo' => [
                    'inicio' => $periodStart->toDateString(),
                    'fin' => $periodEnd->toDateString(),
                ],
            ],
            'kpis_automaticos' => $kpis,
            'respuestas' => $responses,
            'overall_score' => $evaluation->overall_score ? (float) $evaluation->overall_score : null,
        ];

        return "Evaluación:\n```json\n" . json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n```";
    }

    private function periodDays(Evaluation $e): int
    {
        return match ($e->kind->value) {
            '30d' => 30,
            '60d' => 60,
            '90d' => 90,
            default => 90,
        };
    }
}
