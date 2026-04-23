<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Domain\Enums;

enum NotificationChannel: string
{
    case InApp = 'in_app';
    case Email = 'email';
    case Push = 'push';

    /**
     * Laravel notifications channel name correspondiente.
     */
    public function laravelChannel(): string
    {
        return match ($this) {
            self::InApp => 'database',
            self::Email => 'mail',
            self::Push => 'broadcast', // fase 2 FCM / APNs
        };
    }
}
