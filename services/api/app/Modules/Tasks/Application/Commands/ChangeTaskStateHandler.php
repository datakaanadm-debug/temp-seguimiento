<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Application\Commands;

use App\Modules\Tasks\Application\Services\TaskStateMachine;
use App\Modules\Tasks\Domain\Enums\TaskState;
use App\Modules\Tasks\Domain\Events\TaskBlocked;
use App\Modules\Tasks\Domain\Events\TaskStateChanged;
use App\Modules\Tasks\Domain\Task;
use Illuminate\Support\Facades\DB;

final class ChangeTaskStateHandler
{
    public function __construct(
        private readonly TaskStateMachine $fsm,
    ) {}

    public function handle(ChangeTaskState $command): Task
    {
        /** @var Task $task */
        $task = Task::query()->with('project')->findOrFail($command->taskId);

        $target = TaskState::from($command->targetState);
        $from = $task->state;

        $this->fsm->assertCanTransition($task, $target, $command->actor, $command->reason);

        return DB::transaction(function () use ($task, $target, $from, $command) {
            $this->fsm->applyTransition($task, $target, $command->reason);
            $task->updated_by = $command->actor->id;
            $task->save();

            DB::afterCommit(function () use ($task, $from, $target, $command) {
                event(new TaskStateChanged($task, $from, $target, $command->actor, $command->reason));

                if ($target === TaskState::Blocked) {
                    event(new TaskBlocked($task, $command->reason ?? '', $command->actor));
                }
            });

            return $task;
        });
    }
}
