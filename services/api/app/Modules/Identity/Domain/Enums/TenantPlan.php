<?php

declare(strict_types=1);

namespace App\Modules\Identity\Domain\Enums;

enum TenantPlan: string
{
    case Starter = 'starter';
    case Growth = 'growth';
    case Business = 'business';
    case Enterprise = 'enterprise';

    public function maxInterns(): ?int
    {
        return match ($this) {
            self::Starter => 10,
            self::Growth => 50,
            self::Business => 200,
            self::Enterprise => null, // ilimitado
        };
    }

    public function aiCallsPerDay(): ?int
    {
        return match ($this) {
            self::Starter => 100,
            self::Growth => 1000,
            self::Business => 5000,
            self::Enterprise => null,
        };
    }
}
