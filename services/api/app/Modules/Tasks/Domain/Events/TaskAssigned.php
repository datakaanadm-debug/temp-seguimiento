<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Domain\Events;

use App\Modules\Identity\Domain\User;
use App\Modules\Tasks\Domain\Task;
use App\Shared\Events\DomainEvent;

final class TaskAssigned extends DomainEvent
{
    public function __construct(
        public readonly Task $task,
        public readonly ?string $previousAssigneeId,
        public readonly ?string $newAssigneeId,
        public readonly User $actor,
    ) {
        parent::__construct();
    }
}
