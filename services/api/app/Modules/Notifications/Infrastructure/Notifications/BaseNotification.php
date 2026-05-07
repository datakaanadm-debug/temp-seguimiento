<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Infrastructure\Notifications;

use App\Modules\Identity\Domain\User;
use App\Modules\Notifications\Application\Services\PreferenceMatrix;
use App\Modules\Notifications\Domain\Enums\NotificationCategory;
use App\Modules\Notifications\Domain\Enums\NotificationChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Base para notifications del sistema. Aplica PreferenceMatrix para decidir canales.
 * Subclases definen `category()` y los métodos de render (toDatabase/toMail/etc.).
 */
abstract class BaseNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;
    public int $backoff = 10;

    /** Override de Queueable trait: queue por canal. */
    public function viaQueues(): array
    {
        return [
            'mail' => 'notifications',
            'database' => 'notifications',
            'broadcast' => 'notifications',
        ];
    }

    abstract public function category(): NotificationCategory;

    /**
     * @return list<string>   channel names ('database', 'mail', 'broadcast')
     */
    public function via(mixed $notifiable): array
    {
        if (!$notifiable instanceof User) {
            return ['database'];
        }

        /** @var PreferenceMatrix $matrix */
        $matrix = app(PreferenceMatrix::class);
        $channels = $matrix->channelsFor($notifiable->id, $this->category());

        return array_map(fn (NotificationChannel $c) => $c->laravelChannel(), $channels);
    }
}
