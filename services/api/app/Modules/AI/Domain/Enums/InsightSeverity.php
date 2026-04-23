<?php

declare(strict_types=1);

namespace App\Modules\AI\Domain\Enums;

enum InsightSeverity: string
{
    case Info = 'info';
    case Warning = 'warning';
    case Critical = 'critical';

    public function weight(): int
    {
        return match ($this) {
            self::Critical => 0,
            self::Warning => 1,
            self::Info => 2,
        };
    }
}
