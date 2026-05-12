<?php

declare(strict_types=1);

namespace App\Modules\Performance\Application\Commands;

use App\Modules\Performance\Domain\Enums\EvaluationStatus;
use App\Modules\Performance\Domain\Evaluation;
use App\Modules\Performance\Domain\Events\EvaluationDisputed;
use App\Modules\Performance\Domain\Exceptions\InvalidEvaluationTransition;
use Illuminate\Support\Facades\DB;

final class DisputeEvaluationHandler
{
    public function handle(DisputeEvaluation $command): Evaluation
    {
        /** @var Evaluation $evaluation */
        $evaluation = Evaluation::query()->findOrFail($command->evaluationId);

        if ($evaluation->subject_user_id !== $command->subject->id) {
            throw InvalidEvaluationTransition::onlySubjectDisputes();
        }
        if (!$evaluation->status->canTransitionTo(EvaluationStatus::Disputed)) {
            throw InvalidEvaluationTransition::between($evaluation->status, EvaluationStatus::Disputed);
        }

        DB::transaction(function () use ($evaluation, $command) {
            $evaluation->status = EvaluationStatus::Disputed;
            // Guardamos la razón en narrative concatenado para no introducir
            // una columna nueva — el resolver la lee al cerrar la disputa.
            // Marcado con prefijo [DISPUTA·yyyy-mm-dd] para que sea visible.
            if (!empty($command->reason)) {
                $stamp = '[DISPUTA · ' . now()->toIso8601String() . '] ' . $command->reason;
                $evaluation->narrative = trim(($evaluation->narrative ? $evaluation->narrative . "\n\n" : '') . $stamp);
            }
            $evaluation->save();

            DB::afterCommit(fn () => event(
                new EvaluationDisputed($evaluation, $command->subject, $command->reason),
            ));
        });

        return $evaluation->fresh();
    }
}
