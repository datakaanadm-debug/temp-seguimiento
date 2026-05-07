<?php

declare(strict_types=1);

namespace App\Modules\Reports\Application\Jobs;

use App\Modules\Reports\Application\Services\UniversityReportBuilder;
use App\Modules\Reports\Domain\Enums\ReportKind;
use App\Modules\Reports\Domain\Enums\RunStatus;
use App\Modules\Reports\Domain\Events\ReportFailed;
use App\Modules\Reports\Domain\Events\ReportGenerated;
use App\Modules\Reports\Domain\ReportRun;
use App\Shared\Storage\TenantStorage;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Job async que genera un reporte PDF. Reconstituye el contexto de tenant
 * al inicio (crítico porque los jobs no heredan el middleware).
 */
final class GenerateReportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $backoff = 60;
    public int $timeout = 180;

    public function __construct(
        public readonly string $runId,
        public readonly string $tenantId,
    ) {
        $this->onQueue('reports');
    }

    public function handle(UniversityReportBuilder $uniBuilder): void
    {
        TenantContext::run($this->tenantId, function () use ($uniBuilder) {
            /** @var ReportRun $run */
            $run = ReportRun::query()->with('template')->findOrFail($this->runId);

            $run->status = RunStatus::Running;
            $run->started_at = now();
            $run->save();

            try {
                $view = $this->resolveView($run);
                $data = $this->buildData($run, $uniBuilder);

                $storedKey = TenantStorage::path(
                    "reports/{$run->id}-" . Str::slug($run->template->name) . '.pdf'
                );

                // Render a archivo temporal local con dompdf (PHP puro,
                // sin dependencias de Chrome/Node), subir luego a R2.
                $tmp = tempnam(sys_get_temp_dir(), 'rpt-') . '.pdf';
                $pdf = Pdf::loadView($view, $data)->setPaper('a4');
                file_put_contents($tmp, $pdf->output());

                $bytes = filesize($tmp) ?: 0;
                Storage::disk(TenantStorage::DISK)->put($storedKey, file_get_contents($tmp));
                @unlink($tmp);

                $run->status = RunStatus::Completed;
                $run->completed_at = now();
                $run->file_key = $storedKey;
                $run->file_size_bytes = $bytes;
                $run->save();

                event(new ReportGenerated($run));
            } catch (\Throwable $e) {
                $run->status = RunStatus::Failed;
                $run->error_message = Str::limit($e->getMessage(), 2000);
                $run->save();
                event(new ReportFailed($run, $e->getMessage()));
                throw $e;
            }
        });
    }

    private function resolveView(ReportRun $run): string
    {
        // Si el template define un layout custom, usarlo; sino default del kind.
        $layout = $run->template->layout;
        if ($layout && $layout !== 'default') {
            return 'reports.' . $layout;
        }
        return $run->template->kind->defaultView();
    }

    /**
     * Selecciona el builder según kind y arma el payload.
     */
    private function buildData(ReportRun $run, UniversityReportBuilder $uniBuilder): array
    {
        $kind = $run->template->kind;
        $periodStart = $run->period_start ?? now()->subMonths(3);
        $periodEnd = $run->period_end ?? now();

        if ($kind === ReportKind::University && $run->subject_type === 'user' && $run->subject_id) {
            return $uniBuilder->build(
                internUserId: $run->subject_id,
                periodStart: $periodStart,
                periodEnd: $periodEnd,
            );
        }

        // Fallback mínimo: Executive/Team/Custom — en fase 2 se implementan builders específicos.
        return [
            'tenant' => ['id' => $this->tenantId, 'name' => TenantContext::current()->name],
            'kind' => $kind->value,
            'period' => [
                'start' => $periodStart->format('Y-m-d'),
                'end' => $periodEnd->format('Y-m-d'),
            ],
            'parameters' => $run->parameters ?? [],
            'generated_at' => now()->toIso8601String(),
        ];
    }

    public function failed(\Throwable $e): void
    {
        report($e);
    }
}
