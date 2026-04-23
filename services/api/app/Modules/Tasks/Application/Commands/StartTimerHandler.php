<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Application\Commands;

use App\Modules\Tasks\Domain\Enums\TimeEntrySource;
use App\Modules\Tasks\Domain\Exceptions\TimerAlreadyRunning;
use App\Modules\Tasks\Domain\Task;
use App\Modules\Tasks\Domain\TimeEntry;

final class StartTimerHandler
{
    public function handle(StartTimer $command): TimeEntry
    {
        // Verificar que no haya otro timer activo del mismo user
        $running = TimeEntry::query()
            ->running()
            ->forUser($command->user->id)
            ->exists();

        if ($running) {
            throw TimerAlreadyRunning::forUser();
        }

        /** @var Task $task */
        $task = Task::query()->findOrFail($command->taskId);

        return TimeEntry::create([
            'task_id' => $task->id,
            'user_id' => $command->user->id,
            'started_at' => now(),
            'note' => $command->note,
            'source' => TimeEntrySource::Timer->value,
        ]);
    }
}
