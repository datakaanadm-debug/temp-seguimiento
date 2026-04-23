<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Domain\Enums;

enum ProjectStatus: string
{
    case Active = 'active';
    case Paused = 'paused';
    case Archived = 'archived';
    case Completed = 'completed';

    public function isWritable(): bool
    {
        return $this === self::Active;
    }
}
