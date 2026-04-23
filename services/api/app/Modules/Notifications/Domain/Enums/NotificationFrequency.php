<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Domain\Enums;

enum NotificationFrequency: string
{
    case Immediate = 'immediate';
    case Hourly = 'hourly';
    case Daily = 'daily';
    case Never = 'never';
}
