<?php

declare(strict_types=1);

namespace App\Modules\AI\Application\Jobs;

use App\Modules\AI\Application\Commands\SummarizeDailyReport;
use App\Modules\AI\Application\Commands\SummarizeDailyReportHandler;
use App\Modules\AI\Domain\Exceptions\AiQuotaExceeded;
use App\Modules\AI\Domain\Exceptions\LlmCallFailed;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Async job que genera el resumen IA de un reporte diario.
 *
 * Fallos de QuotaExceeded se absorben silenciosamente (no re-intento);
 * fallos de red/API se reintentan con backoff.
 */
final class GenerateDailySummaryJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30;
    public int $timeout = 120;

    public function __construct(
        public readonly string $dailyReportId,
        public readonly string $tenantId,
    ) {
        $this->onQueue('ai');
    }

    public function handle(SummarizeDailyReportHandler $handler): void
    {
        TenantContext::run($this->tenantId, function () use ($handler) {
            try {
                $handler->handle(new SummarizeDailyReport($this->dailyReportId));
            } catch (AiQuotaExceeded $e) {
                // Silencioso: no re-intentar. Métrica ya queda en ai_request_log.
                $this->delete();
                return;
            } catch (LlmCallFailed $e) {
                // Permitir retry
                throw $e;
            }
        });
    }

    public function failed(\Throwable $e): void
    {
        report($e);
    }
}
