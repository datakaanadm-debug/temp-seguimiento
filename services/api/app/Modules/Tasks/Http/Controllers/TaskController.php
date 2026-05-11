<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Controllers;

use App\Modules\Identity\Domain\Enums\MembershipRole;
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
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
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
            // Eager-load collaborators evita N+1 en TaskResource::resolveCollaborators
            // (antes: 1 query por Task × 100 tasks = 100 queries extra en /tareas).
            ->with(['assignee', 'reviewer', 'tags', 'collaborators'])
            ->withCount(['subtasks', 'comments', 'attachments']);

        if ($projectId = $request->query('project_id')) {
            $query->where('project_id', $projectId);
        }
        if ($listId = $request->query('list_id')) {
            $query->where('list_id', $listId);
        }
        // Filtro por subtareas: ?parent_task_id=xxx muestra las hijas de una
        // tarea concreta. ANTES no estaba aplicado y devolvía todas las del
        // tenant — el panel "Subtareas" del detalle se llenaba con basura.
        if ($parent = $request->query('parent_task_id')) {
            $query->where('parent_task_id', $parent);
        }
        // Filtro por OKR vinculado: usado por widgets de progreso de KR.
        if ($kr = $request->query('key_result_id')) {
            $query->where('key_result_id', $kr);
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

        // Modelo C: scoping por rol/team. Admin/HR ven todo; team_lead ve
        // tareas de proyectos de teams donde es lead; mentor/intern/supervisor
        // ven sus tareas (assignee/reviewer/creator/watcher) + las de teams
        // donde son members. Sin esto un practicante ve TODO el tenant en
        // lista y luego 404a al abrir un detalle ajeno (info-leak + UX rota).
        $this->scopeByRole($query, $request->user());

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
        $task->load(['assignee', 'reviewer', 'tags', 'list', 'project', 'collaborators'])
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
            collaboratorIds: (array) $request->input('collaborator_ids', []),
        ));

        return response()->json([
            'data' => TaskResource::make($task->fresh(['assignee', 'reviewer', 'tags', 'collaborators']))->resolve(),
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
            'data' => TaskResource::make($updated->fresh(['assignee', 'reviewer', 'tags', 'collaborators']))->resolve(),
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

    /**
     * Scoping del listing por rol del usuario (modelo C).
     *
     * - tenant_admin / hr → ven todo el tenant.
     * - team_lead       → ven tareas suyas + tareas de proyectos en teams donde son lead.
     * - mentor          → ven tareas suyas + de practicantes que mentorean.
     * - intern / supervisor / viewer → ven sus tareas + las de proyectos en teams donde son members.
     *
     * Modifica $query in-place con un OR-group de condiciones de visibilidad.
     */
    private function scopeByRole($query, $user): void
    {
        $role = $user->primaryRole();
        $tenantId = TenantContext::currentId();

        // Admin y HR: sin restricción adicional, devuelven todo el tenant.
        if (in_array($role, [MembershipRole::TenantAdmin, MembershipRole::HR], true)) {
            return;
        }

        $query->where(function ($q) use ($user, $role, $tenantId) {
            // Siempre: tareas donde uno es protagonista
            $q->where('assignee_id', $user->id)
                ->orWhere('reviewer_id', $user->id)
                ->orWhere('created_by', $user->id)
                // Watcher en pivote
                ->orWhereIn('id', function ($sub) use ($user) {
                    $sub->select('task_id')->from('task_assignees')
                        ->where('user_id', $user->id);
                });

            // Tareas de proyectos cuyo team incluye al usuario (members o lead).
            $q->orWhereIn('project_id', function ($sub) use ($user, $tenantId) {
                $sub->select('p.id')->from('projects as p')
                    ->whereIn('p.team_id', function ($t) use ($user, $tenantId) {
                        $t->select('team_id')->from('team_memberships')
                            ->where('tenant_id', $tenantId)
                            ->where('user_id', $user->id)
                            ->whereNull('left_at');
                    });
            });

            // Team lead: además los proyectos de teams donde lead_user_id = uno
            if ($role === MembershipRole::TeamLead) {
                $q->orWhereIn('project_id', function ($sub) use ($user, $tenantId) {
                    $sub->select('p.id')->from('projects as p')
                        ->join('teams as t', 't.id', '=', 'p.team_id')
                        ->where('t.tenant_id', $tenantId)
                        ->where('t.lead_user_id', $user->id);
                });
            }

            // Mentor: además tareas asignadas a sus interns (mentor_assignments)
            if ($role === MembershipRole::Mentor) {
                $q->orWhereIn('assignee_id', function ($sub) use ($user, $tenantId) {
                    $sub->select('intern_user_id')->from('mentor_assignments')
                        ->where('tenant_id', $tenantId)
                        ->where('mentor_user_id', $user->id)
                        ->where('status', 'active');
                });
            }
        });
    }
}
