<?php

declare(strict_types=1);

namespace App\Modules\People\Domain\Enums;

enum AssignmentStatus: string
{
    case Active = 'active';
    case Ended = 'ended';
    case Paused = 'paused';
}
