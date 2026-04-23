<?php

declare(strict_types=1);

namespace App\Modules\AI\Http\Controllers;

use App\Modules\AI\Application\Commands\DetectRiskInsights;
use App\Modules\AI\Application\Commands\DetectRiskInsightsHandler;
use App\Modules\AI\Domain\AiInsight;
use App\Modules\AI\Domain\Exceptions\AiQuotaExceeded;
use App\Modules\AI\Domain\Exceptions\LlmCallFailed;
use App\Modules\AI\Http\Resources\AiInsightResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;

final class InsightController extends Controller
{
    public function __construct(
        private readonly DetectRiskInsightsHandler $detectHandler,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', AiInsight::class);

        $query = AiInsight::query();

        if ($request->boolean('active_only', true)) {
            $query->active();
        }
        if ($kind = $request->query('kind')) {
            $query->where('kind', $kind);
        }
        if ($severity = $request->query('severity')) {
            $query->where('severity', $severity);
        }
        if ($subject = $request->query('subject_id')) {
            $query->where('subject_id', $subject);
        }

        $items = $query
            ->orderBy('severity')  // critical primero por enum weight
            ->orderByDesc('created_at')
            ->paginate((int) $request->integer('per_page', 50));

        return response()->json([
            'data' => AiInsightResource::collection($items),
            'meta' => [
                'total' => $items->total(),
                'per_page' => $items->perPage(),
                'current_page' => $items->currentPage(),
            ],
        ]);
    }

    /**
     * POST /ai/insights/detect  { user_id }
     * Trigger manual. Sync.
     */
    public function detect(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'uuid', 'exists:users,id'],
        ]);
        $this->authorize('viewAny', AiInsight::class);

        try {
            $insights = $this->detectHandler->handle(new DetectRiskInsights($data['user_id']));
        } catch (AiQuotaExceeded|LlmCallFailed $e) {
            throw ValidationException::withMessages(['ai' => $e->getMessage()])->status(429);
        }

        return response()->json([
            'data' => AiInsightResource::collection($insights),
            'count' => count($insights),
        ], 201);
    }

    public function acknowledge(AiInsight $aiInsight, Request $request): JsonResponse
    {
        $this->authorize('manage', $aiInsight);

        $aiInsight->acknowledged_at = now();
        $aiInsight->acknowledged_by = $request->user()->id;
        $aiInsight->save();

        return response()->json([
            'data' => AiInsightResource::make($aiInsight)->resolve(),
        ]);
    }

    public function dismiss(AiInsight $aiInsight, Request $request): JsonResponse
    {
        $this->authorize('manage', $aiInsight);

        $aiInsight->dismissed_at = now();
        $aiInsight->dismissed_by = $request->user()->id;
        $aiInsight->save();

        return response()->json([
            'data' => AiInsightResource::make($aiInsight)->resolve(),
        ]);
    }

    public function resolve(AiInsight $aiInsight, Request $request): JsonResponse
    {
        $this->authorize('manage', $aiInsight);

        $aiInsight->resolved_at = now();
        $aiInsight->save();

        return response()->json([
            'data' => AiInsightResource::make($aiInsight)->resolve(),
        ]);
    }
}
