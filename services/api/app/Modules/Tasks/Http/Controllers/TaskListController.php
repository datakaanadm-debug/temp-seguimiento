<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Controllers;

use App\Modules\Tasks\Domain\Project;
use App\Modules\Tasks\Domain\TaskList;
use App\Modules\Tasks\Http\Resources\TaskListResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

final class TaskListController extends Controller
{
    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $lists = $project->lists()->withCount('tasks')->get();

        return response()->json([
            'data' => TaskListResource::collection($lists),
        ]);
    }

    public function store(Project $project, Request $request): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'name' => ['required', 'string', 'min:1', 'max:150'],
            'color' => ['sometimes', 'nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'wip_limit' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ]);

        $position = (int) ((TaskList::query()
            ->where('project_id', $project->id)
            ->whereNull('deleted_at')
            ->max('position') ?? -1) + 1);

        $list = TaskList::create([
            'project_id' => $project->id,
            'name' => $validated['name'],
            'color' => $validated['color'] ?? null,
            'wip_limit' => $validated['wip_limit'] ?? null,
            'position' => $position,
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'data' => TaskListResource::make($list)->resolve(),
        ], 201);
    }

    public function update(TaskList $list, Request $request): JsonResponse
    {
        $this->authorize('update', $list->project);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'min:1', 'max:150'],
            'color' => ['sometimes', 'nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'wip_limit' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ]);

        $list->fill($validated);
        $list->updated_by = $request->user()->id;
        $list->save();

        return response()->json([
            'data' => TaskListResource::make($list)->resolve(),
        ]);
    }

    /**
     * POST /api/v1/projects/{project}/lists/reorder
     * body: { list_ids: [uuid, uuid, ...] }
     */
    public function reorder(Project $project, Request $request): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'list_ids' => ['required', 'array', 'min:1'],
            'list_ids.*' => ['uuid'],
        ]);

        DB::transaction(function () use ($project, $validated) {
            foreach ($validated['list_ids'] as $pos => $id) {
                TaskList::query()
                    ->where('id', $id)
                    ->where('project_id', $project->id)
                    ->update(['position' => $pos, 'updated_at' => now()]);
            }
        });

        return response()->json([
            'data' => TaskListResource::collection($project->lists()->get()),
        ]);
    }

    public function destroy(TaskList $list, Request $request): JsonResponse
    {
        $this->authorize('update', $list->project);

        if ($list->tasks()->whereNull('deleted_at')->exists()) {
            abort(422, 'Cannot delete a list with tasks. Move or delete the tasks first.');
        }

        $list->delete();
        return response()->json(['ok' => true]);
    }
}
