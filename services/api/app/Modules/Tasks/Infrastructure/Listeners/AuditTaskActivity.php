<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Infrastructure\Listeners;

use App\Modules\Tasks\Domain\Events\TaskCreated;
use App\Modules\Tasks\Domain\Events\TaskStateChanged;
use App\Modules\Tasks\Domain\Events\TaskUpdated;
use App\Modules\Tasks\Domain\Task;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Registra eventos de Task en activity_log. Sync (insert único, sub-ms).
 */
final class AuditTaskActivity
{
    public function handle(TaskCreated|TaskUpdated|TaskStateChanged $event): void
    {
        $entry = match (true) {
            $event instanceof TaskCreated => [
                'event' => 'created',
                'description' => "Task created",
                'properties' => [
                    'title' => $event->task->title,
                    'state' => $event->task->state->value,
                    'priority' => $event->task->priority->value,
                ],
            ],
            $event instanceof TaskStateChanged => [
                'event' => 'state_changed',
                'description' => "State: {$event->from->value} → {$event->to->value}",
                'properties' => [
                    'from' => $event->from->value,
                    'to' => $event->to->value,
                    'reason' => $event->reason,
                ],
            ],
            $event instanceof TaskUpdated => [
                'event' => 'updated',
                'description' => "Task updated",
                'properties' => ['changes' => $event->changes],
            ],
        };

        $actor = match (true) {
            $event instanceof TaskCreated => $event->actor,
            $event instanceof TaskStateChanged => $event->actor,
            $event instanceof TaskUpdated => $event->actor,
        };

        DB::table('activity_log')->insert([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $event->task->tenant_id,
            'log_name' => 'tasks',
            'description' => $entry['description'],
            'subject_type' => Task::class,
            'subject_id' => $event->task->id,
            'causer_type' => $actor::class,
            'causer_id' => $actor->id,
            'event' => $entry['event'],
            'properties' => json_encode($entry['properties']),
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
            'request_id' => request()?->header('X-Request-Id'),
            'created_at' => now(),
        ]);
    }
}
