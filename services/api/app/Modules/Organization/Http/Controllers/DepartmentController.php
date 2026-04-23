<?php

declare(strict_types=1);

namespace App\Modules\Organization\Http\Controllers;

use App\Modules\Organization\Application\Commands\CreateDepartment;
use App\Modules\Organization\Application\Commands\CreateDepartmentHandler;
use App\Modules\Organization\Domain\Department;
use App\Modules\Organization\Http\Requests\CreateDepartmentRequest;
use App\Modules\Organization\Http\Resources\DepartmentResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

final class DepartmentController extends Controller
{
    public function __construct(
        private readonly CreateDepartmentHandler $createHandler,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Department::class);

        $departments = Department::query()
            ->with(['areas' => fn ($q) => $q->orderBy('position')])
            ->orderBy('position')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => DepartmentResource::collection($departments),
        ]);
    }

    public function show(Department $department): JsonResponse
    {
        $this->authorize('view', $department);

        $department->load(['areas.teams']);

        return response()->json([
            'data' => DepartmentResource::make($department)->resolve(),
        ]);
    }

    public function store(CreateDepartmentRequest $request): JsonResponse
    {
        $department = $this->createHandler->handle(new CreateDepartment(
            name: $request->string('name'),
            slug: strtolower((string) $request->string('slug')),
            actor: $request->user(),
            position: (int) $request->integer('position', 0),
            metadata: (array) $request->input('metadata', []),
        ));

        return response()->json([
            'data' => DepartmentResource::make($department)->resolve(),
        ], 201);
    }

    public function update(Department $department, Request $request): JsonResponse
    {
        $this->authorize('update', $department);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:150'],
            'position' => ['sometimes', 'integer', 'min:0'],
            'metadata' => ['sometimes', 'array'],
        ]);

        $department->fill($validated);
        $department->updated_by = $request->user()->id;
        $department->save();

        return response()->json([
            'data' => DepartmentResource::make($department)->resolve(),
        ]);
    }

    public function destroy(Department $department, Request $request): JsonResponse
    {
        $this->authorize('delete', $department);
        $department->delete();

        return response()->json(['ok' => true]);
    }
}
