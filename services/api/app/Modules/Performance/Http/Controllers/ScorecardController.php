<?php

declare(strict_types=1);

namespace App\Modules\Performance\Http\Controllers;

use App\Modules\Performance\Application\Commands\CreateScorecard;
use App\Modules\Performance\Application\Commands\CreateScorecardHandler;
use App\Modules\Performance\Application\Commands\UpdateScorecardWithMetricsHandler;
use App\Modules\Performance\Domain\Scorecard;
use App\Modules\Performance\Http\Requests\CreateScorecardRequest;
use App\Modules\Performance\Http\Resources\ScorecardResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

final class ScorecardController extends Controller
{
    public function __construct(
        private readonly CreateScorecardHandler $createHandler,
        private readonly UpdateScorecardWithMetricsHandler $updateHandler,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Scorecard::class);

        $query = Scorecard::query()->withCount('metrics');
        if ($request->boolean('active_only', true)) {
            $query->where('is_active', true);
        }
        if ($applicable = $request->query('applicable_to')) {
            $query->where('applicable_to', $applicable);
        }

        return response()->json([
            'data' => ScorecardResource::collection($query->orderBy('name')->get()),
        ]);
    }

    public function show(Scorecard $scorecard): JsonResponse
    {
        $this->authorize('view', $scorecard);
        $scorecard->load('metrics');

        return response()->json([
            'data' => ScorecardResource::make($scorecard)->resolve(),
        ]);
    }

    public function store(CreateScorecardRequest $request): JsonResponse
    {
        $scorecard = $this->createHandler->handle(new CreateScorecard(
            actor: $request->user(),
            name: $request->string('name'),
            description: $request->string('description') ?: null,
            applicableTo: $request->string('applicable_to', 'intern'),
            metrics: (array) $request->input('metrics', []),
        ));

        return response()->json([
            'data' => ScorecardResource::make($scorecard)->resolve(),
        ], 201);
    }

    public function update(Scorecard $scorecard, Request $request): JsonResponse
    {
        $this->authorize('update', $scorecard);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:150'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
            // Métricas opcionales: si se pasan, se reemplazan via upsert por `key`
            // (las que mantienen el key conservan su id y por ende las responses
            // existentes; las que desaparecen se borran).
            'metrics' => ['sometimes', 'array', 'min:1', 'max:30'],
            'metrics.*.key' => ['required_with:metrics', 'string', 'max:60', 'regex:/^[a-z][a-z0-9_]*$/'],
            'metrics.*.label' => ['required_with:metrics', 'string', 'max:150'],
            'metrics.*.type' => ['required_with:metrics', 'string', 'in:auto,manual,likert,rubric'],
            'metrics.*.source' => ['sometimes', 'nullable', 'string', 'max:60'],
            'metrics.*.target_value' => ['sometimes', 'nullable', 'numeric'],
            'metrics.*.unit' => ['sometimes', 'nullable', 'string', 'max:20'],
            'metrics.*.weight' => ['sometimes', 'numeric', 'min:0.01', 'max:10'],
            'metrics.*.config' => ['sometimes', 'array'],
            'metrics.*.position' => ['sometimes', 'integer', 'min:0'],
        ]);

        $updated = $this->updateHandler->handle($scorecard->id, $validated);

        return response()->json([
            'data' => ScorecardResource::make($updated)->resolve(),
        ]);
    }

    public function destroy(Scorecard $scorecard): JsonResponse
    {
        $this->authorize('delete', $scorecard);
        $scorecard->delete();
        return response()->json(['ok' => true]);
    }
}
