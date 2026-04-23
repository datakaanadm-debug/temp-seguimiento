<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Domain\Enums;

enum AssigneeRole: string
{
    case Assignee = 'assignee';
    case Reviewer = 'reviewer';
    case Watcher = 'watcher';
}
