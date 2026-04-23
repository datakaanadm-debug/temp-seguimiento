<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Domain\Enums;

enum BlockerStatus: string
{
    case Open = 'open';
    case Acknowledged = 'acknowledged';
    case Resolved = 'resolved';
    case Dismissed = 'dismissed';

    public function isActive(): bool
    {
        return in_array($this, [self::Open, self::Acknowledged], true);
    }
}
