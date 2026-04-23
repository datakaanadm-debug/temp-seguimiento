<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Domain\Events;

use App\Modules\Identity\Domain\User;
use App\Modules\Tasks\Domain\Project;
use App\Shared\Events\DomainEvent;

final class ProjectCreated extends DomainEvent
{
    public function __construct(
        public readonly Project $project,
        public readonly User $actor,
    ) {
        parent::__construct();
    }
}
