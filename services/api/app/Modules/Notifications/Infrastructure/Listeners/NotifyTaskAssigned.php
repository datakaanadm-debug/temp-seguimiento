<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Infrastructure\Listeners;

use App\Modules\Identity\Domain\User;
use App\Modules\Notifications\Infrastructure\Notifications\TaskAssignedNotification;
use App\Modules\Tasks\Domain\Events\TaskAssigned;
use App\Shared\Idempotency\ProcessedEvent;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Contracts\Queue\ShouldQueue;

final class NotifyTaskAssigned implements ShouldQueue
{
    public string $queue = 'notifications';
    public int $tries = 5;
    public int $backoff = 10;

    public function handle(TaskAssigned $event): void
    {
        if (!$event->newAssigneeId || $event->newAssigneeId === $event->previousAssigneeId) {
            return;
        }
        // No autonotificarse (user se asigna a sí mismo)
        if ($event->newAssigneeId === $event->actor->id) {
            return;
        }

        ProcessedEvent::guard(
            eventId: $event->id,
            handler: self::class,
            tenantId: $event->task->tenant_id,
            do: function () use ($event) {
                TenantContext::run($event->task->tenant_id, function () use ($event) {
                    /** @var ?User $assignee */
                    $assignee = User::query()->find($event->newAssigneeId);
                    if (!$assignee) {
                        return;
                    }
                    $assignee->notify(new TaskAssignedNotification($event->task, $event->actor));
                });
            }
        );
    }
}
