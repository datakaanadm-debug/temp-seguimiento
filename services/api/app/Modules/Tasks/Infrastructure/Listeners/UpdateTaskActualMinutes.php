<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Infrastructure\Listeners;

use App\Modules\Tasks\Domain\Events\TimeEntryStopped;
use App\Modules\Tasks\Domain\Task;
use App\Shared\Idempotency\ProcessedEvent;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\DB;

/**
 * Al parar (o registrar manual) una TimeEntry, suma los minutos al `actual_minutes` de la Task.
 *
 * Async: evita añadir latencia al endpoint de stop-timer que el usuario usa constantemente.
 */
final class UpdateTaskActualMinutes implements ShouldQueue
{
    public string $queue = 'default';
    public int $tries = 3;
    public int $backoff = 5;
    public int $timeout = 15;

    public function handle(TimeEntryStopped $event): void
    {
        ProcessedEvent::guard(
            eventId: $event->id,
            handler: self::class,
            tenantId: $event->entry->tenant_id,
            do: function () use ($event) {
                TenantContext::run($event->entry->tenant_id, function () use ($event) {
                    $duration = $event->entry->duration_minutes ?? 0;
                    if ($duration <= 0) {
                        return;
                    }

                    // increment atomic; evita race entre múltiples timer stop del mismo task
                    DB::table('tasks')
                        ->where('id', $event->entry->task_id)
                        ->where('tenant_id', $event->entry->tenant_id)
                        ->update([
                            'actual_minutes' => DB::raw("actual_minutes + {$duration}"),
                            'updated_at' => now(),
                        ]);

                    // Refresh en memoria por si otros listeners lo leen
                    Task::query()->find($event->entry->task_id);
                });
            }
        );
    }
}
