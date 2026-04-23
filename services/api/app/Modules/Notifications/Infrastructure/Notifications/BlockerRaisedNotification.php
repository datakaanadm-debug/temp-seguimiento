<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Infrastructure\Notifications;

use App\Modules\Notifications\Domain\Enums\NotificationCategory;
use App\Modules\Tracking\Domain\Blocker;
use Illuminate\Notifications\Messages\MailMessage;

final class BlockerRaisedNotification extends BaseNotification
{
    public function __construct(
        public readonly Blocker $blocker,
    ) {}

    public function category(): NotificationCategory
    {
        return NotificationCategory::BlockerRaised;
    }

    public function toDatabase(mixed $notifiable): array
    {
        return [
            'category' => $this->category()->value,
            'title' => "Bloqueo reportado ({$this->blocker->severity->value}): {$this->blocker->title}",
            'body' => \Illuminate\Support\Str::limit($this->blocker->description ?? '', 200),
            'blocker_id' => $this->blocker->id,
            'raised_by' => $this->blocker->raised_by,
            'severity' => $this->blocker->severity->value,
            'related_task_id' => $this->blocker->related_task_id,
            'tenant_id' => $this->blocker->tenant_id,
        ];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        $url = rtrim(config('app.frontend_url'), '/') . "/bloqueos/{$this->blocker->id}";
        return (new MailMessage())
            ->subject("⚠ Nuevo bloqueo: {$this->blocker->title}")
            ->greeting("Hola {$notifiable->name},")
            ->line("Se reportó un bloqueo con severidad {$this->blocker->severity->value}.")
            ->line($this->blocker->description ?? '')
            ->action('Ver detalle', $url);
    }
}
