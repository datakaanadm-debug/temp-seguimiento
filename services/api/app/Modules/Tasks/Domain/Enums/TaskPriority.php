<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Domain\Enums;

enum TaskPriority: string
{
    case Urgent = 'urgent';
    case High = 'high';
    case Normal = 'normal';
    case Low = 'low';

    public function sortWeight(): int
    {
        return match ($this) {
            self::Urgent => 0,
            self::High => 1,
            self::Normal => 2,
            self::Low => 3,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Urgent => 'Urgente',
            self::High => 'Alta',
            self::Normal => 'Normal',
            self::Low => 'Baja',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Urgent => '#EF4444',
            self::High => '#F59E0B',
            self::Normal => '#64748B',
            self::Low => '#94A3B8',
        };
    }
}
