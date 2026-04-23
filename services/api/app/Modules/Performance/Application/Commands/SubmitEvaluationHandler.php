<?php

declare(strict_types=1);

namespace App\Modules\Performance\Application\Commands;

use App\Modules\Performance\Domain\Enums\EvaluationStatus;
use App\Modules\Performance\Domain\Evaluation;
use App\Modules\Performance\Domain\Events\EvaluationSubmitted;
use App\Modules\Performance\Domain\Exceptions\InvalidEvaluationTransition;
use Illuminate\Support\Facades\DB;

final class SubmitEvaluationHandler
{
    public function handle(SubmitEvaluation $command): Evaluation
    {
        /** @var Evaluation $evaluation */
        $evaluation = Evaluation::query()->findOrFail($command->evaluationId);

        if ($evaluation->subject_user_id === $command->evaluator->id) {
            throw InvalidEvaluationTransition::subjectCannotSign();
        }
        if (!$evaluation->status->canTransitionTo(EvaluationStatus::Submitted)) {
            throw InvalidEvaluationTransition::between($evaluation->status, EvaluationStatus::Submitted);
        }

        DB::transaction(function () use ($evaluation, $command) {
            $evaluation->status = EvaluationStatus::Submitted;
            $evaluation->submitted_at = now();
            $evaluation->signed_at = now();
            if (!$evaluation->evaluator_user_id) {
                $evaluation->evaluator_user_id = $command->evaluator->id;
            }
            $evaluation->save();

            DB::afterCommit(fn () => event(new EvaluationSubmitted($evaluation, $command->evaluator)));
        });

        return $evaluation->fresh();
    }
}
