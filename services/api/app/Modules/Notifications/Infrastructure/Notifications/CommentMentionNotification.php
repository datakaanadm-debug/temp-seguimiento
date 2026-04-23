<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Infrastructure\Notifications;

use App\Modules\Identity\Domain\User;
use App\Modules\Notifications\Domain\Enums\NotificationCategory;
use App\Modules\Tasks\Domain\Comment;
use App\Modules\Tasks\Domain\Task;
use Illuminate\Notifications\Messages\MailMessage;

final class CommentMentionNotification extends BaseNotification
{
    public function __construct(
        public readonly Task $task,
        public readonly Comment $comment,
        public readonly User $author,
    ) {}

    public function category(): NotificationCategory
    {
        return NotificationCategory::CommentMentioned;
    }

    public function toDatabase(mixed $notifiable): array
    {
        return [
            'category' => $this->category()->value,
            'title' => "{$this->author->name} te mencionó",
            'body' => \Illuminate\Support\Str::limit($this->comment->body, 200),
            'task_id' => $this->task->id,
            'comment_id' => $this->comment->id,
            'author_id' => $this->author->id,
            'tenant_id' => $this->task->tenant_id,
        ];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        $url = rtrim(config('app.frontend_url'), '/') . "/tareas/{$this->task->id}#comment-{$this->comment->id}";
        return (new MailMessage())
            ->subject("{$this->author->name} te mencionó en {$this->task->title}")
            ->greeting("Hola {$notifiable->name},")
            ->line("{$this->author->name} te mencionó en un comentario:")
            ->line('"' . \Illuminate\Support\Str::limit($this->comment->body, 400) . '"')
            ->action('Ver conversación', $url);
    }
}
