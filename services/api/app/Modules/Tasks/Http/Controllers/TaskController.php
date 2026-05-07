<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Controllers;

use App\Modules\Tasks\Application\Commands\ChangeTaskState;
use App\Modules\Tasks\Application\Commands\ChangeTaskStateHandler;
use App\Modules\Tasks\Application\Commands\CreateTask;
use App\Modules\Tasks\Application\Commands\CreateTaskHandler;
use App\Modules\Tasks\Application\Commands\UpdateTask;
use App\Modules\Tasks\Application\Commands\UpdateTaskHandler;
use App\Modules\Tasks\Domain\Exceptions\InvalidTaskTransition;
use App\Modules\Tasks\Domain\Task;
use App\Modules\Tasks\Http\Requests\ChangeTaskStateRequest;
use App\Modules\Tasks\Http\Requests\CreateTaskRequest;
use App\Modules\Tasks\Http\Requests\UpdateTaskRequest;
use App\Modules\Tasks\Http\Resources\TaskResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;

final class TaskController extends Controller
{
    public function __construct(
        private readonly CreateTaskHandler $createHandler,
        private readonly UpdateTaskHandler $updateHandler,
        private readonly ChangeTaskStateHandler $stateHandler,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Task::class);

        $query = Task::query()
            ->with(['assignee', 'reviewer', 'tags'])
            ->withCount(['subtasks', 'comments', 'attachments']);

        if ($projectId = $request->query('project_id')) {
            $query->where('project_id', $projectId);
        }
        if ($listId = $request->query('list_id')) {
            $query->where('list_id', $listId);
        }
        if ($state = $request->query('state')) {
            $query->where('state', $state);
        }
        if ($assignee = $request->query('assignee_id')) {
            $query->where('assignee_id', $assignee);
        }
        if ($priority = $request->query('priority')) {
            $query->where('priority', $priority);
        }
        if ($request->boolean('mine')) {
            $query->assignedTo($request->user()->id);
        }
        if ($request->boolean('overdue')) {
            $query->overdue();
        }
        if ($q = $request->query('q')) {
            $query->where(fn ($sub) => $sub
                ->where('title', 'ilike', "%{$q}%")
                ->orWhere('description', 'ilike', "%{$q}%"));
        }

        $sort = $request->query('sort', 'position');
        $dir = $request->query('dir', 'asc') === 'desc' ? 'desc' : 'asc';
        if (in_array($sort, ['position', 'created_at', 'due_at', 'priority', 'updated_at'], true)) {
            $query->orderBy($sort, $dir);
        }

        $tasks = $query->paginate((int) $request->integer('per_page', 50));

        return response()->json([
            'data' => TaskResource::collection($tasks),
            'meta' => [
                'total' => $tasks->total(),
                'per_page' => $tasks->perPage(),
                'current_page' => $tasks->currentPage(),
                'last_page' => $tasks->lastPage(),
            ],
        ]);
    }

    public function show(Task $task): JsonResponse
    {
        $this->authorize('view', $task);
        $task->load(['assignee', 'reviewer', 'tags', 'list', 'project'])
            ->loadCount(['subtasks', 'comments', 'attachments']);

        return response()->json([
            'data' => TaskResource::make($task)->resolve(),
        ]);
    }

    public function store(CreateTaskRequest $request): JsonResponse
    {
        $task = $this->createHandler->handle(new CreateTask(
            projectId: (string) $request->string('project_id'),
            title: (string) $request->string('title'),
            actor: $request->user(),
            listId: $request->filled('list_id') ? (string) $request->string('list_id') : null,
            parentTaskId: $request->filled('parent_task_id') ? (string) $request->string('parent_task_id') : null,
            keyResultId: $request->filled('key_result_id') ? (string) $request->string('key_result_id') : null,
            description: $request->filled('description') ? (string) $request->string('description') : null,
            priority: (string) $request->string('priority', 'normal'),
            assigneeId: $request->filled('assignee_id') ? (string) $request->string('assignee_id') : null,
            reviewerId: $request->filled('reviewer_id') ? (string) $request->string('reviewer_id') : null,
            dueAt: $request->filled('due_at') ? (string) $request->string('due_at') : null,
            estimatedMinutes: $request->has('estimated_minutes')
                ? (int) $request->integer('estimated_minutes') : null,
            tagIds: (array) $request->input('tag_ids', []),
        ));

        return response()->json([
            'data' => TaskResource::make($task->fresh(['assignee', 'reviewer', 'tags']))->resolve(),
        ], 201);
    }

    public function update(Task $task, UpdateTaskRequest $request): JsonResponse
    {
        $this->authorize('update', $task);

        $updated = $this->updateHandler->handle(new UpdateTask(
            taskId: $task->id,
            actor: $request->user(),
            fields: $request->validated(),
        ));

        return response()->json([
            'data' => TaskResource::make($updated->fresh(['assignee', 'reviewer', 'tags']))->resolve(),
        ]);
    }

    public function changeState(Task $task, ChangeTaskStateRequest $request): JsonResponse
    {
        $this->authorize('changeState', $task);

        try {
            $task = $this->stateHandler->handle(new ChangeTaskState(
                taskId: $task->id,
                targetState: (string) $request->string('state'),
                actor: $request->user(),
                reason: $request->filled('reason') ? (string) $request->string('reason') : null,
            ));
        } catch (InvalidTaskTransition $e) {
            throw ValidationException::withMessages(['state' => $e->getMessage()]);
        }

        return response()->json([
            'data' => TaskResource::make($task->fresh(['assignee', 'reviewer']))->resolve(),
        ]);
    }

    public function destroy(Task $task, Request $request): JsonResponse
    {
        $this->authorize('delete', $task);
        $task->delete();

        return response()->json(['ok' => true]);
    }
}
