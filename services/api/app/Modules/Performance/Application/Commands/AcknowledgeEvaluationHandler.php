<?php

declare(strict_types=1);

namespace App\Modules\Performance\Application\Commands;

use App\Modules\Performance\Domain\Enums\EvaluationStatus;
use App\Modules\Performance\Domain\Evaluation;
use App\Modules\Performance\Domain\Events\EvaluationAcknowledged;
use App\Modules\Performance\Domain\Exceptions\InvalidEvaluationTransition;
use Illuminate\Support\Facades\DB;

final class AcknowledgeEvaluationHandler
{
    public function handle(AcknowledgeEvaluation $command): Evaluation
    {
        /** @var Evaluation $evaluation */
        $evaluation = Evaluation::query()->findOrFail($command->evaluationId);

        if ($evaluation->subject_user_id !== $command->subject->id) {
            throw InvalidEvaluationTransition::onlySubjectAcknowledges();
        }
        if (!$evaluation->status->canTransitionTo(EvaluationStatus::Acknowledged)) {
            throw InvalidEvaluationTransition::between($evaluation->status, EvaluationStatus::Acknowledged);
        }

        DB::transaction(function () use ($evaluation, $command) {
            $evaluation->status = EvaluationStatus::Acknowledged;
            $evaluation->acknowledged_at = now();
            $evaluation->save();

            DB::afterCommit(fn () => event(new EvaluationAcknowledged($evaluation, $command->subject)));
        });

        return $evaluation->fresh();
    }
}
