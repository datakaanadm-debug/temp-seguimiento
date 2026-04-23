<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Application\Commands;

use App\Modules\Tracking\Domain\DailyReport;
use App\Modules\Tracking\Domain\Enums\DailyReportStatus;
use App\Modules\Tracking\Domain\Events\DailyReportSubmitted;
use Illuminate\Support\Facades\DB;

/**
 * Crea o actualiza el reporte diario del user para una fecha.
 * Un único reporte por (tenant, user, report_date) — constraint DB.
 */
final class UpsertDailyReportHandler
{
    public function handle(UpsertDailyReport $command): DailyReport
    {
        return DB::transaction(function () use ($command) {
            /** @var DailyReport $report */
            $report = DailyReport::query()
                ->where('user_id', $command->user->id)
                ->where('report_date', $command->reportDate)
                ->first();

            $isNew = !$report;
            $wasSubmitted = $report?->status === DailyReportStatus::Submitted;

            if (!$report) {
                $report = new DailyReport();
                $report->user_id = $command->user->id;
                $report->report_date = $command->reportDate;
                $report->status = DailyReportStatus::Draft->value;
            }

            $report->progress_summary = $command->progressSummary;
            $report->blockers_text = $command->blockersText;
            $report->plan_tomorrow = $command->planTomorrow;
            $report->mood = $command->mood;
            $report->hours_worked = $command->hoursWorked;

            if ($command->submit) {
                $report->markSubmitted();
            }

            $report->save();

            // Emit evento solo si pasa a submitted por primera vez
            if ($command->submit && !$wasSubmitted) {
                DB::afterCommit(fn () => event(new DailyReportSubmitted($report)));
            }

            return $report;
        });
    }
}
