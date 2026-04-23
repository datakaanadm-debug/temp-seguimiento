<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Domain\Events;

use App\Modules\Identity\Domain\User;
use App\Modules\Tasks\Domain\Task;
use App\Shared\Events\DomainEvent;

final class TaskBlocked extends DomainEvent
{
    public function __construct(
        public readonly Task $task,
        public readonly string $reason,
        public readonly User $actor,
    ) {
        parent::__construct();
    }
}
