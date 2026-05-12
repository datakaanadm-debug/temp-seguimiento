<?php

declare(strict_types=1);

namespace App\Modules\Performance\Application\Commands;

use App\Modules\Performance\Domain\Enums\EvaluationStatus;
use App\Modules\Performance\Domain\Evaluation;
use App\Modules\Performance\Domain\Events\EvaluationResolved;
use App\Modules\Performance\Domain\Exceptions\InvalidEvaluationTransition;
use Illuminate\Support\Facades\DB;

final class ResolveDisputeHandler
{
    public function handle(ResolveDispute $command): Evaluation
    {
        /** @var Evaluation $evaluation */
        $evaluation = Evaluation::query()->findOrFail($command->evaluationId);

        if (!$evaluation->status->canTransitionTo(EvaluationStatus::Resolved)) {
            throw InvalidEvaluationTransition::between($evaluation->status, EvaluationStatus::Resolved);
        }

        DB::transaction(function () use ($evaluation, $command) {
            $evaluation->status = EvaluationStatus::Resolved;
            if (!empty($command->resolution)) {
                $stamp = '[RESOLUCIÓN · ' . now()->toIso8601String()
                    . ' por ' . ($command->resolver->name ?? $command->resolver->email) . '] '
                    . $command->resolution;
                $evaluation->narrative = trim(($evaluation->narrative ? $evaluation->narrative . "\n\n" : '') . $stamp);
            }
            $evaluation->save();

            DB::afterCommit(fn () => event(
                new EvaluationResolved($evaluation, $command->resolver, $command->resolution),
            ));
        });

        return $evaluation->fresh();
    }
}
