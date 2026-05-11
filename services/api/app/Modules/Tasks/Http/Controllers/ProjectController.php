<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Controllers;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Tasks\Application\Commands\CreateProject;
use App\Modules\Tasks\Application\Commands\CreateProjectHandler;
use App\Modules\Tasks\Domain\Events\ProjectCompleted;
use App\Modules\Tasks\Domain\Project;
use App\Modules\Tasks\Http\Requests\CreateProjectRequest;
use App\Modules\Tasks\Http\Resources\ProjectResource;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

final class ProjectController extends Controller
{
    public function __construct(
        private readonly CreateProjectHandler $createHandler,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Project::class);

        $query = Project::query()
            ->withCount('tasks')
            ->orderByDesc('updated_at');

        if ($team = $request->query('team_id')) {
            $query->where('team_id', $team);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        // Scoping por rol: admin/HR ven todo; el resto ve proyectos de teams
        // donde son members o leads. Sin esto un practicante ve TODOS los
        // proyectos del tenant en /proyectos y en pickers.
        $user = $request->user();
        $role = $user->primaryRole();
        $tenantId = TenantContext::currentId();
        if (!in_array($role, [MembershipRole::TenantAdmin, MembershipRole::HR], true)) {
            $query->where(function ($q) use ($user, $tenantId) {
                // Member del team del proyecto
                $q->whereIn('team_id', function ($sub) use ($user, $tenantId) {
                    $sub->select('team_id')->from('team_memberships')
                        ->where('tenant_id', $tenantId)
                        ->where('user_id', $user->id)
                        ->whereNull('left_at');
                });
                // Lead del team
                $q->orWhereIn('team_id', function ($sub) use ($user, $tenantId) {
                    $sub->select('id')->from('teams')
                        ->where('tenant_id', $tenantId)
                        ->where('lead_user_id', $user->id);
                });
            });
        }

        // Respeta ?per_page (antes hardcoded a 20).
        $perPage = max(1, min(100, (int) $request->integer('per_page', 20)));
        $projects = $query->paginate($perPage);

        return response()->json([
            'data' => ProjectResource::collection($projects),
            'meta' => [
                'total' => $projects->total(),
                'per_page' => $projects->perPage(),
                'current_page' => $projects->currentPage(),
                'last_page' => $projects->lastPage(),
            ],
        ]);
    }

    public function show(Project $project): JsonResponse
    {
        $this->authorize('view', $project);
        $project->load(['lists'])->loadCount('tasks');

        return response()->json([
            'data' => ProjectResource::make($project)->resolve(),
        ]);
    }

    public function store(CreateProjectRequest $request): JsonResponse
    {
        // `Request::string()` retorna Stringable; el command tipa string/?string,
        // así que casteamos explícitamente para no chocar con el strict type del
        // constructor (mismo bug que ya arreglamos en TimeEntryController/Reports).
        $project = $this->createHandler->handle(new CreateProject(
            teamId: (string) $request->string('team_id'),
            name: (string) $request->string('name'),
            slug: strtolower((string) $request->string('slug')),
            actor: $request->user(),
            description: $request->filled('description') ? (string) $request->string('description') : null,
            color: $request->filled('color') ? (string) $request->string('color') : null,
            startDate: $request->filled('start_date') ? (string) $request->string('start_date') : null,
            endDate: $request->filled('end_date') ? (string) $request->string('end_date') : null,
            withDefaultLists: (bool) $request->boolean('with_default_lists', true),
        ));

        return response()->json([
            'data' => ProjectResource::make($project->load('lists'))->resolve(),
        ], 201);
    }

    public function update(Project $project, Request $request): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:200'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'status' => ['sometimes', 'string', 'in:active,paused,archived,completed'],
            'color' => ['sometimes', 'nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'start_date' => ['sometimes', 'nullable', 'date'],
            'end_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:start_date'],
        ]);

        if (($validated['status'] ?? null) === 'archived' && !$project->archived_at) {
            $validated['archived_at'] = now();
        }

        $previousStatus = $project->status;

        $project->fill($validated);
        $project->updated_by = $request->user()->id;
        $project->save();

        // Si el proyecto pasó a `completed` (y no lo estaba antes), disparar evento
        // que la gamificación recoge para otorgar `first-project`.
        if (
            ($validated['status'] ?? null) === 'completed'
            && $previousStatus !== 'completed'
        ) {
            event(new ProjectCompleted($project->fresh(), $request->user()));
        }

        return response()->json([
            'data' => ProjectResource::make($project)->resolve(),
        ]);
    }

    public function destroy(Project $project, Request $request): JsonResponse
    {
        $this->authorize('delete', $project);
        $project->delete();

        return response()->json(['ok' => true]);
    }
}
