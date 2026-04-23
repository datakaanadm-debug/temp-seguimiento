<?php

declare(strict_types=1);

namespace App\Modules\Reports\Application\Commands;

use App\Modules\Reports\Application\Jobs\GenerateReportJob;
use App\Modules\Reports\Domain\Enums\RunStatus;
use App\Modules\Reports\Domain\ReportRun;
use App\Modules\Reports\Domain\ReportTemplate;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;

/**
 * Crea un ReportRun en status=queued y dispatcha el job async que generará el PDF.
 */
final class RequestReportHandler
{
    public function handle(RequestReport $command): ReportRun
    {
        /** @var ReportTemplate $template */
        $template = ReportTemplate::query()->findOrFail($command->templateId);

        return DB::transaction(function () use ($command, $template) {
            $run = ReportRun::create([
                'template_id' => $template->id,
                'requested_by' => $command->requester->id,
                'subject_type' => $command->subjectType,
                'subject_id' => $command->subjectId,
                'period_start' => $command->periodStart,
                'period_end' => $command->periodEnd,
                'parameters' => $command->parameters,
                'status' => RunStatus::Queued->value,
                'expires_at' => now()->addDays(7),
            ]);

            DB::afterCommit(fn () => GenerateReportJob::dispatch(
                runId: $run->id,
                tenantId: TenantContext::currentId(),
            )->onQueue('reports'));

            return $run;
        });
    }
}
