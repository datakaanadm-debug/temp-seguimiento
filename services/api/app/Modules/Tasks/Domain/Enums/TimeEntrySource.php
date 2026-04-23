<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Domain\Enums;

enum TimeEntrySource: string
{
    case Timer = 'timer';
    case Manual = 'manual';
    case Auto = 'auto';
}
