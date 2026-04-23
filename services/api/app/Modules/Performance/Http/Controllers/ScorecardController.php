<?php

declare(strict_types=1);

namespace App\Modules\Performance\Http\Controllers;

use App\Modules\Performance\Application\Commands\CreateScorecard;
use App\Modules\Performance\Application\Commands\CreateScorecardHandler;
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
        ]);
        $scorecard->fill($validated);
        $scorecard->save();

        return response()->json([
            'data' => ScorecardResource::make($scorecard->fresh('metrics'))->resolve(),
        ]);
    }

    public function destroy(Scorecard $scorecard): JsonResponse
    {
        $this->authorize('delete', $scorecard);
        $scorecard->delete();
        return response()->json(['ok' => true]);
    }
}
