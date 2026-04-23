<?php

declare(strict_types=1);

namespace App\Shared\Idempotency;

use Closure;
use Illuminate\Support\Facades\DB;

/**
 * Guardia de idempotencia para listeners/jobs async.
 *
 * Uso típico dentro de un listener:
 *
 *     ProcessedEvent::guard(
 *         eventId: $event->id,
 *         handler: self::class,
 *         do: fn () => $this->sendEmail(...)
 *     );
 *
 * Si el evento ya fue procesado por este handler, el callback no se ejecuta.
 */
final class ProcessedEvent
{
    public static function guard(string $eventId, string $handler, Closure $do, ?string $tenantId = null): void
    {
        $exists = DB::table('processed_events')
            ->where('event_id', $eventId)
            ->where('handler', $handler)
            ->exists();

        if ($exists) {
            return;
        }

        DB::transaction(function () use ($eventId, $handler, $do, $tenantId) {
            // Upsert para evitar race condition entre chequeo y insert.
            DB::table('processed_events')->insertOrIgnore([
                'event_id' => $eventId,
                'handler' => $handler,
                'tenant_id' => $tenantId,
                'processed_at' => now(),
            ]);

            // Re-verificar: si alguien más ya procesó en paralelo, abortamos.
            $count = DB::table('processed_events')
                ->where('event_id', $eventId)
                ->where('handler', $handler)
                ->count();

            if ($count === 1) {
                $do();
            }
        });
    }
}
