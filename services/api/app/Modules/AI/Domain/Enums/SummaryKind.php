<?php

declare(strict_types=1);

namespace App\Modules\AI\Domain\Enums;

enum SummaryKind: string
{
    case Daily = 'daily';
    case Weekly = 'weekly';
    case Task = 'task';
    case Evaluation = 'evaluation';
    case Session = 'session';
    case Project = 'project';
}
