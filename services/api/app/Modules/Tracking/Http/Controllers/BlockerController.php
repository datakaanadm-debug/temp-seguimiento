<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Http\Controllers;

use App\Modules\Tracking\Application\Commands\RaiseBlocker;
use App\Modules\Tracking\Application\Commands\RaiseBlockerHandler;
use App\Modules\Tracking\Application\Commands\ResolveBlocker;
use App\Modules\Tracking\Application\Commands\ResolveBlockerHandler;
use App\Modules\Tracking\Domain\Blocker;
use App\Modules\Tracking\Http\Requests\RaiseBlockerRequest;
use App\Modules\Tracking\Http\Requests\ResolveBlockerRequest;
use App\Modules\Tracking\Http\Resources\BlockerResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

final class BlockerController extends Controller
{
    public function __construct(
        private readonly RaiseBlockerHandler $raiseHandler,
        private readonly ResolveBlockerHandler $resolveHandler,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Blocker::class);

        $query = Blocker::query()->with(['raiser']);

        if ($status = $request->query('status')) {
            if ($status === 'active') {
                $query->open();
            } else {
                $query->where('status', $status);
            }
        }
        if ($severity = $request->query('severity')) {
            $query->where('severity', $severity);
        }
        if ($userId = $request->query('raised_by')) {
            $query->where('raised_by', $userId);
        }

        $blockers = $query
            ->orderByDesc('created_at')
            ->paginate((int) $request->integer('per_page', 30));

        return response()->json([
            'data' => BlockerResource::collection($blockers),
            'meta' => [
                'total' => $blockers->total(),
                'per_page' => $blockers->perPage(),
                'current_page' => $blockers->currentPage(),
                'last_page' => $blockers->lastPage(),
            ],
        ]);
    }

    public function store(RaiseBlockerRequest $request): JsonResponse
    {
        $blocker = $this->raiseHandler->handle(new RaiseBlocker(
            raiser: $request->user(),
            title: $request->string('title'),
            severity: $request->string('severity', 'medium'),
            description: $request->string('description') ?: null,
            relatedTaskId: $request->string('related_task_id') ?: null,
            dailyReportId: $request->string('daily_report_id') ?: null,
        ));

        return response()->json([
            'data' => BlockerResource::make($blocker->fresh('raiser'))->resolve(),
        ], 201);
    }

    public function show(Blocker $blocker): JsonResponse
    {
        $this->authorize('view', $blocker);
        $blocker->load('raiser');

        return response()->json([
            'data' => BlockerResource::make($blocker)->resolve(),
        ]);
    }

    public function resolve(Blocker $blocker, ResolveBlockerRequest $request): JsonResponse
    {
        $this->authorize('resolve', $blocker);

        $resolved = $this->resolveHandler->handle(new ResolveBlocker(
            blockerId: $blocker->id,
            resolver: $request->user(),
            resolution: $request->string('resolution'),
            dismiss: (bool) $request->boolean('dismiss', false),
        ));

        return response()->json([
            'data' => BlockerResource::make($resolved->fresh('raiser'))->resolve(),
        ]);
    }
}
