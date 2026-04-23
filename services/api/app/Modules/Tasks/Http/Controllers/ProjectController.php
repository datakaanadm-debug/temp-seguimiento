<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Controllers;

use App\Modules\Tasks\Application\Commands\CreateProject;
use App\Modules\Tasks\Application\Commands\CreateProjectHandler;
use App\Modules\Tasks\Domain\Project;
use App\Modules\Tasks\Http\Requests\CreateProjectRequest;
use App\Modules\Tasks\Http\Resources\ProjectResource;
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

        $projects = $query->paginate(20);

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
        $project = $this->createHandler->handle(new CreateProject(
            teamId: $request->string('team_id'),
            name: $request->string('name'),
            slug: strtolower((string) $request->string('slug')),
            actor: $request->user(),
            description: $request->string('description') ?: null,
            color: $request->string('color') ?: null,
            startDate: $request->string('start_date') ?: null,
            endDate: $request->string('end_date') ?: null,
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

        $project->fill($validated);
        $project->updated_by = $request->user()->id;
        $project->save();

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
