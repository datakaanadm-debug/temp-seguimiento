<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Domain\Events;

use App\Modules\Identity\Domain\User;
use App\Modules\Tasks\Domain\Project;
use App\Shared\Events\DomainEvent;

/**
 * Disparado cuando un Project pasa a status `completed`.
 *
 * Se usa para:
 *   · Otorgar `first-project` a quien creó/lideró el proyecto (Gamification).
 *   · Futuro: notificación a stakeholders, archivar tareas relacionadas, etc.
 */
final class ProjectCompleted extends DomainEvent
{
    public function __construct(
        public readonly Project $project,
        public readonly User $actor,
    ) {
        parent::__construct();
    }
}
