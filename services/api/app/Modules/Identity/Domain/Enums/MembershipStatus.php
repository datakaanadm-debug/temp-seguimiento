<?php

declare(strict_types=1);

namespace App\Modules\Identity\Domain\Enums;

enum MembershipStatus: string
{
    case Active = 'active';
    case Suspended = 'suspended';
    case Removed = 'removed';
}
