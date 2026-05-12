<?php

declare(strict_types=1);

namespace App\Modules\Performance\Application\Commands;

use App\Modules\Performance\Domain\Enums\EvaluationStatus;
use App\Modules\Performance\Domain\Evaluation;
use App\Modules\Performance\Domain\Exceptions\InvalidEvaluationTransition;
use Illuminate\Support\Facades\DB;

final class CancelEvaluationHandler
{
    public function handle(CancelEvaluation $command): Evaluation
    {
        /** @var Evaluation $evaluation */
        $evaluation = Evaluation::query()->findOrFail($command->evaluationId);

        if (!$evaluation->status->canTransitionTo(EvaluationStatus::Cancelled)) {
            throw InvalidEvaluationTransition::between($evaluation->status, EvaluationStatus::Cancelled);
        }

        DB::transaction(function () use ($evaluation, $command) {
            $evaluation->status = EvaluationStatus::Cancelled;
            if (!empty($command->reason)) {
                $stamp = '[CANCELADA · ' . now()->toIso8601String()
                    . ' por ' . ($command->actor->name ?? $command->actor->email) . '] '
                    . $command->reason;
                $evaluation->narrative = trim(($evaluation->narrative ? $evaluation->narrative . "\n\n" : '') . $stamp);
            }
            $evaluation->save();
        });

        return $evaluation->fresh();
    }
}
