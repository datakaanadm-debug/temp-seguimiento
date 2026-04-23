<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Domain\Events;

use App\Modules\Identity\Domain\User;
use App\Modules\Tasks\Domain\Enums\TaskState;
use App\Modules\Tasks\Domain\Task;
use App\Shared\Events\DomainEvent;

final class TaskStateChanged extends DomainEvent
{
    public function __construct(
        public readonly Task $task,
        public readonly TaskState $from,
        public readonly TaskState $to,
        public readonly User $actor,
        public readonly ?string $reason = null,
    ) {
        parent::__construct();
    }
}
