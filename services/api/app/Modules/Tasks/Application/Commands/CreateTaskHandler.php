<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Application\Commands;

use App\Modules\Tasks\Domain\Enums\TaskState;
use App\Modules\Tasks\Domain\Events\TaskCreated;
use App\Modules\Tasks\Domain\Project;
use App\Modules\Tasks\Domain\Task;
use App\Modules\Tasks\Domain\TaskList;
use Illuminate\Support\Facades\DB;

final class CreateTaskHandler
{
    public function handle(CreateTask $command): Task
    {
        /** @var Project $project */
        $project = Project::query()->findOrFail($command->projectId);

        if (!$project->status->isWritable()) {
            abort(422, 'Project is not writable.');
        }

        $listId = $command->listId;
        if (!$listId) {
            // Default a primera lista del proyecto si existe
            $listId = TaskList::query()
                ->where('project_id', $project->id)
                ->orderBy('position')
                ->value('id');
        }

        // Position: al final de la lista
        $position = 0;
        if ($listId) {
            $position = (int) (Task::query()
                ->where('list_id', $listId)
                ->whereNull('deleted_at')
                ->max('position') ?? -1) + 1;
        }

        return DB::transaction(function () use ($command, $project, $listId, $position) {
            $task = Task::create([
                'project_id' => $project->id,
                'list_id' => $listId,
                'parent_task_id' => $command->parentTaskId,
                'title' => $command->title,
                'description' => $command->description,
                'state' => TaskState::ToDo->value,
                'priority' => $command->priority,
                'assignee_id' => $command->assigneeId,
                'reviewer_id' => $command->reviewerId,
                'due_at' => $command->dueAt,
                'estimated_minutes' => $command->estimatedMinutes,
                'position' => $position,
                'metadata' => [],
                'created_by' => $command->actor->id,
                'updated_by' => $command->actor->id,
            ]);

            if (!empty($command->tagIds)) {
                $task->tags()->sync(array_fill_keys(
                    $command->tagIds,
                    ['tenant_id' => $task->tenant_id]
                ));
            }

            DB::afterCommit(function () use ($task, $command) {
                event(new TaskCreated($task, $command->actor));
            });

            return $task;
        });
    }
}
