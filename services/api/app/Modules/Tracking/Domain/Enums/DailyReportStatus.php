<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Domain\Enums;

enum DailyReportStatus: string
{
    case Draft = 'draft';
    case Submitted = 'submitted';
    case Reviewed = 'reviewed';
}
