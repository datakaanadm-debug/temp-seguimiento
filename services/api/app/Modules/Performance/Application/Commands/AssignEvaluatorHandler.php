<?php

declare(strict_types=1);

namespace App\Modules\Performance\Application\Commands;

use App\Modules\Performance\Domain\Evaluation;
use App\Modules\Performance\Domain\Exceptions\InvalidEvaluationTransition;
use Illuminate\Support\Facades\DB;

/**
 * Cambia o limpia el evaluador asignado a una evaluación. Sólo válido en
 * SCHEDULED o IN_PROGRESS — una vez submitted el evaluador queda fijo.
 *
 * Pasar evaluatorUserId=null desasigna (deja el slot abierto para que lo
 * tome el primer staff autorizado que entre).
 */
final class AssignEvaluatorHandler
{
    public function handle(AssignEvaluator $command): Evaluation
    {
        /** @var Evaluation $evaluation */
        $evaluation = Evaluation::query()->findOrFail($command->evaluationId);

        if (!$evaluation->status->isWritable()) {
            throw InvalidEvaluationTransition::evaluatorAlreadyStarted();
        }

        DB::transaction(function () use ($evaluation, $command) {
            $evaluation->evaluator_user_id = $command->evaluatorUserId;
            $evaluation->save();
        });

        return $evaluation->fresh(['subject', 'evaluator']);
    }
}
