<?php

declare(strict_types=1);

namespace App\Modules\AI\Infrastructure\Listeners;

use App\Modules\AI\Application\Jobs\GenerateDailySummaryJob;
use App\Modules\Tracking\Domain\Events\DailyReportSubmitted;
use App\Shared\Idempotency\ProcessedEvent;

/**
 * Al enviar un reporte diario, dispatcha el job async de resumen IA.
 */
final class TriggerDailySummary
{
    public function handle(DailyReportSubmitted $event): void
    {
        ProcessedEvent::guard(
            eventId: $event->id,
            handler: self::class,
            tenantId: $event->report->tenant_id,
            do: fn () => GenerateDailySummaryJob::dispatch(
                dailyReportId: $event->report->id,
                tenantId: $event->report->tenant_id,
            )
        );
    }
}
