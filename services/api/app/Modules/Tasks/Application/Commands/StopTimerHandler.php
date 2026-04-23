<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Application\Commands;

use App\Modules\Tasks\Domain\Events\TimeEntryStopped;
use App\Modules\Tasks\Domain\TimeEntry;
use Illuminate\Support\Facades\DB;

final class StopTimerHandler
{
    public function handle(StopTimer $command): TimeEntry
    {
        /** @var TimeEntry $entry */
        $entry = TimeEntry::query()->findOrFail($command->timeEntryId);

        if ($entry->user_id !== $command->user->id) {
            abort(403, 'Cannot stop another user\'s timer.');
        }
        if (!$entry->isRunning()) {
            return $entry;  // idempotente
        }

        $endedAt = now();
        $durationMin = max(0, (int) round($entry->started_at->diffInSeconds($endedAt) / 60));

        DB::transaction(function () use ($entry, $endedAt, $durationMin, $command) {
            $entry->ended_at = $endedAt;
            $entry->duration_minutes = $durationMin;
            if ($command->note !== null) {
                $entry->note = $command->note;
            }
            $entry->save();

            DB::afterCommit(fn () => event(new TimeEntryStopped($entry)));
        });

        return $entry->fresh();
    }
}
