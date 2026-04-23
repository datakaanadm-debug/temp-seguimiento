<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Application\Commands;

use App\Modules\Tracking\Domain\DailyReport;
use App\Modules\Tracking\Domain\Enums\DailyReportStatus;
use App\Modules\Tracking\Domain\Events\DailyReportReviewed;
use Illuminate\Support\Facades\DB;

final class ReviewDailyReportHandler
{
    public function handle(ReviewDailyReport $command): DailyReport
    {
        /** @var DailyReport $report */
        $report = DailyReport::query()->findOrFail($command->reportId);

        if ($report->status !== DailyReportStatus::Submitted) {
            abort(422, 'Only submitted reports can be reviewed.');
        }
        if ($report->user_id === $command->reviewer->id) {
            abort(422, 'Cannot review your own daily report.');
        }

        DB::transaction(function () use ($report, $command) {
            $report->status = DailyReportStatus::Reviewed;
            $report->reviewed_by = $command->reviewer->id;
            $report->reviewed_at = now();
            $report->save();

            DB::afterCommit(fn () => event(new DailyReportReviewed($report, $command->reviewer)));
        });

        return $report->fresh();
    }
}
