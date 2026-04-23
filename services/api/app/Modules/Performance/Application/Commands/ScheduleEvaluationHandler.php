<?php

declare(strict_types=1);

namespace App\Modules\Performance\Application\Commands;

use App\Modules\Performance\Domain\Enums\EvaluationStatus;
use App\Modules\Performance\Domain\Evaluation;
use App\Modules\Performance\Domain\Events\EvaluationScheduled;
use Illuminate\Support\Facades\DB;

final class ScheduleEvaluationHandler
{
    public function handle(ScheduleEvaluation $command): Evaluation
    {
        return DB::transaction(function () use ($command) {
            $evaluation = Evaluation::create([
                'scorecard_id' => $command->scorecardId,
                'subject_user_id' => $command->subjectUserId,
                'evaluator_user_id' => $command->evaluatorUserId,
                'kind' => $command->kind,
                'scheduled_for' => $command->scheduledFor,
                'status' => EvaluationStatus::Scheduled->value,
            ]);

            DB::afterCommit(fn () => event(new EvaluationScheduled($evaluation, $command->actor)));

            return $evaluation;
        });
    }
}
