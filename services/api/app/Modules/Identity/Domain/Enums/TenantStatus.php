<?php

declare(strict_types=1);

namespace App\Modules\Identity\Domain\Enums;

enum TenantStatus: string
{
    case Active = 'active';
    case Trialing = 'trialing';
    case Suspended = 'suspended';
    case Churned = 'churned';

    public function canOperate(): bool
    {
        return match ($this) {
            self::Active, self::Trialing => true,
            self::Suspended, self::Churned => false,
        };
    }
}
