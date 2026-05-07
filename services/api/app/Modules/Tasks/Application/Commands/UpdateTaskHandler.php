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
        'key_result_id',
    ];

    public function handle(UpdateTask $command): Task
    {
        /** @var Task $task */
        $task = Task::query()->findOrFail($command->taskId);

        $toUpdate = array_intersect_key($command->fields, array_flip(self::ALLOWED));
        $tagIds = array_key_exists('tag_ids', $command->fields)
            ? (array) $command->fields['tag_ids']
            : null;
        $collaboratorIds = array_key_exists('collaborator_ids', $command->fields)
            ? (array) $command->fields['collaborator_ids']
            : null;

        if (empty($toUpdate) && $tagIds === null && $collaboratorIds === null) {
            return $task;
        }

        return DB::transaction(function () use ($command, $task, $toUpdate, $tagIds, $collaboratorIds) {
            $prevAssignee = $task->assignee_id;
            $before = $task->only(array_keys($toUpdate));

            if (!empty($toUpdate)) {
                $task->fill($toUpdate);
                $task->updated_by = $command->actor->id;
                $task->save();
            }

            if ($tagIds !== null) {
                $task->tags()->sync($tagIds);
            }

            if ($collaboratorIds !== null) {
                // Sync `task_assignees` con role='assignee'.
                // Conserva otros roles (reviewer, watcher) intactos.
                $tenantId = $task->tenant_id;
                $now = now();

                \DB::table('task_assignees')
                    ->where('task_id', $task->id)
                    ->where('role', 'assignee')
                    ->whereNotIn('user_id', $collaboratorIds ?: ['00000000-0000-0000-0000-000000000000'])
                    ->delete();

                foreach ($collaboratorIds as $uid) {
                    \DB::table('task_assignees')->updateOrInsert(
                        [
                            'task_id' => $task->id,
                            'user_id' => $uid,
                            'role' => 'assignee',
                        ],
                        [
                            'tenant_id' => $tenantId,
                            'assigned_at' => $now,
                            'assigned_by' => $command->actor->id,
                        ],
                    );
                }
            }

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
