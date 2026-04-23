<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Infrastructure\Notifications;

use App\Modules\Identity\Domain\User;
use App\Modules\Notifications\Domain\Enums\NotificationCategory;
use App\Modules\Tasks\Domain\Task;
use Illuminate\Notifications\Messages\MailMessage;

final class TaskAssignedNotification extends BaseNotification
{
    public function __construct(
        public readonly Task $task,
        public readonly User $actor,
    ) {}

    public function category(): NotificationCategory
    {
        return NotificationCategory::TaskAssigned;
    }

    public function toDatabase(mixed $notifiable): array
    {
        return [
            'category' => $this->category()->value,
            'title' => "Te asignaron: {$this->task->title}",
            'body' => "{$this->actor->name} te asignó la tarea '{$this->task->title}'.",
            'task_id' => $this->task->id,
            'project_id' => $this->task->project_id,
            'actor_id' => $this->actor->id,
            'tenant_id' => $this->task->tenant_id,
        ];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        $url = rtrim(config('app.frontend_url'), '/') . "/tareas/{$this->task->id}";
        return (new MailMessage())
            ->subject("Nueva tarea asignada: {$this->task->title}")
            ->greeting("Hola {$notifiable->name},")
            ->line("{$this->actor->name} te asignó una nueva tarea.")
            ->action('Ver tarea', $url)
            ->line('Prioridad: ' . $this->task->priority->label())
            ->when(
                $this->task->due_at,
                fn ($m) => $m->line('Fecha límite: ' . $this->task->due_at->format('d/m/Y H:i'))
            );
    }
}
