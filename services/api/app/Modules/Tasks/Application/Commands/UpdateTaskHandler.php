<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Application\Commands;

use App\Modules\Tasks\Domain\Events\TaskAssigned;
use App\Modules\Tasks\Domain\Events\TaskUpdated;
use App\Modules\Tasks\Domain\Task;
use Illuminate\Support\Facades\DB;

final class UpdateTaskHandler
{
    /**
     * Campos permitidos vía este endpoint. Excluye `state`: cambio de estado va por
     * ChangeTaskStateHandler (pasa por TaskStateMachine).
     */
    private const ALLOWED = [
        'title', 'description', 'priority',
        'assignee_id', 'reviewer_id',
        'due_at', 'estimated_minutes',
        'list_id', 'position',
    ];

    public function handle(UpdateTask $command): Task
    {
        /** @var Task $task */
        $task = Task::query()->findOrFail($command->taskId);

        $toUpdate = array_intersect_key($command->fields, array_flip(self::ALLOWED));
        if (empty($toUpdate)) {
            return $task;
        }

        return DB::transaction(function () use ($command, $task, $toUpdate) {
            $prevAssignee = $task->assignee_id;
            $before = $task->only(array_keys($toUpdate));

            $task->fill($toUpdate);
            $task->updated_by = $command->actor->id;
            $task->save();

            $changes = [];
            foreach ($toUpdate as $k => $v) {
                if (($before[$k] ?? null) !== $task->{$k}) {
                    $changes[$k] = ['from' => $before[$k] ?? null, 'to' => $task->{$k}];
                }
            }

            DB::afterCommit(function () use ($task, $command, $changes, $prevAssignee) {
                event(new TaskUpdated($task, $command->actor, $changes));

                if (array_key_exists('assignee_id', $changes)) {
                    event(new TaskAssigned(
                        task: $task,
                        previousAssigneeId: $prevAssignee,
                        newAssigneeId: $task->assignee_id,
                        actor: $command->actor,
                    ));
                }
            });

            return $task;
        });
    }
}
