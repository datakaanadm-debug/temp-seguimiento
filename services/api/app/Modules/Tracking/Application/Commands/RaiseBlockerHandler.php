<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Application\Commands;

use App\Modules\Tracking\Domain\Blocker;
use App\Modules\Tracking\Domain\Enums\BlockerStatus;
use App\Modules\Tracking\Domain\Events\BlockerRaised;
use Illuminate\Support\Facades\DB;

final class RaiseBlockerHandler
{
    public function handle(RaiseBlocker $command): Blocker
    {
        return DB::transaction(function () use ($command) {
            $blocker = Blocker::create([
                'raised_by' => $command->raiser->id,
                'related_task_id' => $command->relatedTaskId,
                'daily_report_id' => $command->dailyReportId,
                'title' => $command->title,
                'description' => $command->description,
                'severity' => $command->severity,
                'status' => BlockerStatus::Open->value,
            ]);

            DB::afterCommit(fn () => event(new BlockerRaised($blocker)));

            return $blocker;
        });
    }
}
