<?php

declare(strict_types=1);

namespace App\Modules\Performance\Application\Commands;

use App\Modules\Performance\Application\Services\KpiComputation;
use App\Modules\Performance\Domain\Enums\EvaluationStatus;
use App\Modules\Performance\Domain\Evaluation;
use App\Modules\Performance\Domain\EvaluationResponse;
use App\Modules\Performance\Domain\ScorecardMetric;
use Illuminate\Support\Facades\DB;

/**
 * Guarda las respuestas del evaluador sin cambiar de estado.
 * Si la eval estaba en SCHEDULED, pasa a IN_PROGRESS automáticamente.
 * Calcula auto_value para métricas tipo `auto`.
 */
final class SaveEvaluationResponsesHandler
{
    public function __construct(
        private readonly KpiComputation $kpi,
    ) {}

    public function handle(SaveEvaluationResponses $command): Evaluation
    {
        /** @var Evaluation $evaluation */
        $evaluation = Evaluation::query()->with('scorecard.metrics')->findOrFail($command->evaluationId);

        if (!$evaluation->status->isWritable()) {
            abort(422, 'Evaluation is not writable in its current state.');
        }
        if ($evaluation->evaluator_user_id && $evaluation->evaluator_user_id !== $command->evaluator->id) {
            abort(403, 'You are not the assigned evaluator.');
        }
        if ($evaluation->subject_user_id === $command->evaluator->id) {
            abort(403, 'Cannot evaluate yourself.');
        }

        return DB::transaction(function () use ($command, $evaluation) {
            // Computar periodo para auto metrics: desde start_date del perfil o hace 90 días
            $periodEnd = now();
            $periodStart = $periodEnd->copy()->subDays($this->periodDaysFor($evaluation));

            foreach ($command->responses as $metricId => $values) {
                /** @var ?ScorecardMetric $metric */
                $metric = $evaluation->scorecard->metrics->firstWhere('id', $metricId);
                if (!$metric) {
                    continue;
                }

                $autoValue = null;
                if ($metric->type->isAutoComputable()) {
                    $computed = $this->kpi->compute(
                        metricKey: $metric->key,
                        subjectUserId: $evaluation->subject_user_id,
                        from: $periodStart,
                        to: $periodEnd,
                    );
                    $autoValue = $computed['value'];
                }

                EvaluationResponse::query()->updateOrCreate(
                    [
                        'evaluation_id' => $evaluation->id,
                        'metric_id' => $metricId,
                    ],
                    [
                        'value_numeric' => $values['value_numeric'] ?? null,
                        'value_text' => $values['value_text'] ?? null,
                        'value_json' => $values['value_json'] ?? null,
                        'auto_value' => $autoValue,
                    ]
                );
            }

            if (!$evaluation->evaluator_user_id) {
                $evaluation->evaluator_user_id = $command->evaluator->id;
            }
            if ($command->narrative !== null) {
                $evaluation->narrative = $command->narrative;
            }
            if ($command->overallScore !== null) {
                $evaluation->overall_score = $command->overallScore;
            }
            if ($evaluation->status === EvaluationStatus::Scheduled) {
                $evaluation->status = EvaluationStatus::InProgress;
                $evaluation->started_at = now();
            }
            $evaluation->save();

            return $evaluation->fresh(['scorecard.metrics', 'responses']);
        });
    }

    private function periodDaysFor(Evaluation $e): int
    {
        return match ($e->kind->value) {
            '30d' => 30,
            '60d' => 60,
            '90d' => 90,
            default => 90,
        };
    }
}
