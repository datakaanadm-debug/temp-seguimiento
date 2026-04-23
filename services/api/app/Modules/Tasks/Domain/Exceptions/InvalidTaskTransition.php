<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Domain\Exceptions;

use App\Modules\Tasks\Domain\Enums\TaskState;
use DomainException;

final class InvalidTaskTransition extends DomainException
{
    public static function between(TaskState $from, TaskState $to): self
    {
        return new self("Transition from {$from->value} to {$to->value} is not allowed.");
    }

    public static function blockedNeedsReason(): self
    {
        return new self("Transition to BLOCKED requires a non-empty reason.");
    }

    public static function selfApproval(): self
    {
        return new self("Reviewer cannot be the same as assignee for DONE transition.");
    }

    public static function projectNotWritable(): self
    {
        return new self("Project is archived or paused; tasks cannot be modified.");
    }
}
