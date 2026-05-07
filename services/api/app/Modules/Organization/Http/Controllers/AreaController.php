<?php

declare(strict_types=1);

namespace App\Modules\Organization\Http\Controllers;

use App\Modules\Organization\Application\Commands\CreateArea;
use App\Modules\Organization\Application\Commands\CreateAreaHandler;
use App\Modules\Organization\Domain\Area;
use App\Modules\Organization\Http\Requests\CreateAreaRequest;
use App\Modules\Organization\Http\Resources\AreaResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

final class AreaController extends Controller
{
    public function __construct(
        private readonly CreateAreaHandler $createHandler,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Area::class);

        $query = Area::query()->with('teams')->orderBy('position');

        if ($dep = $request->query('department_id')) {
            $query->where('department_id', $dep);
        }

        return response()->json([
            'data' => AreaResource::collection($query->get()),
        ]);
    }

    public function store(CreateAreaRequest $request): JsonResponse
    {
        $area = $this->createHandler->handle(new CreateArea(
            departmentId: (string) $request->string('department_id'),
            name: (string) $request->string('name'),
            slug: strtolower((string) $request->string('slug')),
            actor: $request->user(),
            position: (int) $request->integer('position', 0),
        ));

        return response()->json([
            'data' => AreaResource::make($area)->resolve(),
        ], 201);
    }

    public function update(Area $area, Request $request): JsonResponse
    {
        $this->authorize('update', $area);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:150'],
            'position' => ['sometimes', 'integer', 'min:0'],
        ]);

        $area->fill($validated);
        $area->updated_by = $request->user()->id;
        $area->save();

        return response()->json([
            'data' => AreaResource::make($area)->resolve(),
        ]);
    }

    public function destroy(Area $area, Request $request): JsonResponse
    {
        $this->authorize('delete', $area);
        $area->delete();

        return response()->json(['ok' => true]);
    }
}
