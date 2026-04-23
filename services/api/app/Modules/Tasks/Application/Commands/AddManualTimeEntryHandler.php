<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Application\Commands;

use App\Modules\Tasks\Domain\Enums\TimeEntrySource;
use App\Modules\Tasks\Domain\Events\TimeEntryStopped;
use App\Modules\Tasks\Domain\Task;
use App\Modules\Tasks\Domain\TimeEntry;
use Illuminate\Support\Facades\DB;

final class AddManualTimeEntryHandler
{
    public function handle(AddManualTimeEntry $command): TimeEntry
    {
        /** @var Task $task */
        $task = Task::query()->findOrFail($command->taskId);

        if ($command->endedAt <= $command->startedAt) {
            abort(422, 'end time must be after start time');
        }

        $durationMin = max(0, (int) round(
            ($command->endedAt->getTimestamp() - $command->startedAt->getTimestamp()) / 60
        ));

        return DB::transaction(function () use ($task, $command, $durationMin) {
            $entry = TimeEntry::create([
                'task_id' => $task->id,
                'user_id' => $command->user->id,
                'started_at' => $command->startedAt,
                'ended_at' => $command->endedAt,
                'duration_minutes' => $durationMin,
                'note' => $command->note,
                'source' => TimeEntrySource::Manual->value,
            ]);

            DB::afterCommit(fn () => event(new TimeEntryStopped($entry)));

            return $entry;
        });
    }
}
