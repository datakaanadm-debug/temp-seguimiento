<?php

declare(strict_types=1);

namespace App\Modules\Performance\Infrastructure\Listeners;

use App\Modules\Audit\Application\Services\ActivityLogger;
use App\Modules\Performance\Domain\Events\EvaluationAcknowledged;
use App\Modules\Performance\Domain\Events\EvaluationDisputed;
use App\Modules\Performance\Domain\Events\EvaluationResolved;
use App\Modules\Performance\Domain\Events\EvaluationScheduled;
use App\Modules\Performance\Domain\Events\EvaluationSubmitted;
use App\Modules\Performance\Domain\Evaluation;
use Illuminate\Support\Facades\DB;

final class AuditPerformanceActivity
{
    public function handle(
        EvaluationScheduled|EvaluationSubmitted|EvaluationAcknowledged|EvaluationDisputed|EvaluationResolved $event,
    ): void {
        match (true) {
            $event instanceof EvaluationScheduled => $this->log($event, 'scheduled', 'programó'),
            $event instanceof EvaluationSubmitted => $this->log($event, 'submitted', 'envió'),
            $event instanceof EvaluationAcknowledged => $this->log($event, 'acknowledged', 'aceptó'),
            $event instanceof EvaluationDisputed => $this->log($event, 'disputed', 'disputó'),
            $event instanceof EvaluationResolved => $this->log($event, 'resolved', 'resolvió'),
        };
    }

    private function log(
        EvaluationScheduled|EvaluationSubmitted|EvaluationAcknowledged|EvaluationDisputed|EvaluationResolved $e,
        string $event,
        string $verb,
    ): void {
        $eval = $e->evaluation;
        $actor = $this->resolveActor($e);
        $subjectName = $this->resolveSubjectName($eval->subject_user_id);
        $actorName = $actor['name'];

        ActivityLogger::record(
            tenantId: $eval->tenant_id,
            logName: 'performance',
            event: $event,
            description: "{$actorName} {$verb} la evaluación de {$subjectName}",
            subjectType: Evaluation::class,
            subjectId: $eval->id,
            causerId: $actor['id'],
            properties: [
                'evaluation_kind' => $eval->kind?->value,
                'subject_user_id' => $eval->subject_user_id,
                'evaluator_user_id' => $eval->evaluator_user_id,
            ],
        );
    }

    /** @return array{id:?string,name:string} */
    private function resolveActor(object $e): array
    {
        // Cada event tiene su propio actor field — los normalizamos.
        $actor = match (true) {
            isset($e->actor) => $e->actor,
            isset($e->evaluator) => $e->evaluator,
            isset($e->subject) => $e->subject,
            isset($e->resolver) => $e->resolver,
            default => null,
        };
        return [
            'id' => $actor?->id,
            'name' => $actor?->name ?? $actor?->email ?? 'Alguien',
        ];
    }

    private function resolveSubjectName(string $userId): string
    {
        return DB::table('users')->where('id', $userId)->value('name') ?? 'practicante';
    }
}
