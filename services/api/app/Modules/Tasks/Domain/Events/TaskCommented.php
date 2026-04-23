<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Domain\Events;

use App\Modules\Identity\Domain\User;
use App\Modules\Tasks\Domain\Comment;
use App\Modules\Tasks\Domain\Task;
use App\Shared\Events\DomainEvent;

final class TaskCommented extends DomainEvent
{
    public function __construct(
        public readonly Task $task,
        public readonly Comment $comment,
        public readonly User $author,
    ) {
        parent::__construct();
    }
}
