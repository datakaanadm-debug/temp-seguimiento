<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Infrastructure\Listeners;

use App\Modules\Identity\Domain\User;
use App\Modules\Notifications\Infrastructure\Notifications\CommentMentionNotification;
use App\Modules\Tasks\Domain\Events\TaskCommented;
use App\Shared\Idempotency\ProcessedEvent;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Contracts\Queue\ShouldQueue;

final class NotifyCommentMentions implements ShouldQueue
{
    public string $queue = 'notifications';
    public int $tries = 5;
    public int $backoff = 10;

    public function handle(TaskCommented $event): void
    {
        $mentions = $event->comment->mentions ?? [];
        if (empty($mentions)) {
            return;
        }

        ProcessedEvent::guard(
            eventId: $event->id,
            handler: self::class,
            tenantId: $event->task->tenant_id,
            do: function () use ($event, $mentions) {
                TenantContext::run($event->task->tenant_id, function () use ($event, $mentions) {
                    // Excluir al autor (no se auto-notifica)
                    $recipients = array_filter($mentions, fn ($id) => $id !== $event->author->id);

                    User::query()
                        ->whereIn('id', $recipients)
                        ->get()
                        ->each(fn (User $u) => $u->notify(
                            new CommentMentionNotification($event->task, $event->comment, $event->author)
                        ));
                });
            }
        );
    }
}
