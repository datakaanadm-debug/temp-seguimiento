<?php

declare(strict_types=1);

namespace App\Modules\Audit\Application\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Helper estático para escribir en activity_log con un sólo INSERT.
 *
 * Diseñado para llamarse desde listeners de domain events:
 *
 *   ActivityLogger::record(
 *       tenantId: $event->task->tenant_id,
 *       logName: 'tasks',
 *       event: 'created',
 *       description: 'Task created',
 *       subjectType: Task::class,
 *       subjectId: $event->task->id,
 *       causerId: $event->actor->id,
 *       properties: ['title' => $event->task->title],
 *   );
 *
 * No tira excepciones — si falla el insert (e.g. tabla corrupta) sólo
 * loguea warning y sigue, para no romper el flujo principal. La pérdida
 * de un log es preferible a romper la acción del usuario.
 */
final class ActivityLogger
{
    /** @param  array<string,mixed>  $properties */
    public static function record(
        string $tenantId,
        string $logName,
        string $event,
        string $description,
        ?string $subjectType = null,
        ?string $subjectId = null,
        ?string $causerType = null,
        ?string $causerId = null,
        array $properties = [],
    ): void {
        try {
            DB::table('activity_log')->insert([
                'id' => Str::uuid()->toString(),
                'tenant_id' => $tenantId,
                'log_name' => $logName,
                'description' => $description,
                'subject_type' => $subjectType,
                'subject_id' => $subjectId,
                'causer_type' => $causerType ?? \App\Modules\Identity\Domain\User::class,
                'causer_id' => $causerId,
                'event' => $event,
                'properties' => json_encode($properties, JSON_UNESCAPED_UNICODE),
                'ip_address' => request()?->ip(),
                'user_agent' => request()?->userAgent(),
                'request_id' => request()?->header('X-Request-Id'),
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            \Log::warning('ActivityLogger insert failed', [
                'error' => $e->getMessage(),
                'log_name' => $logName,
                'event' => $event,
                'subject_id' => $subjectId,
            ]);
        }
    }
}
