<?php

declare(strict_types=1);

namespace App\Modules\AI\Http\Controllers;

use App\Modules\AI\Application\Commands\GenerateEvaluationNarrative;
use App\Modules\AI\Application\Commands\GenerateEvaluationNarrativeHandler;
use App\Modules\AI\Application\Commands\SummarizeDailyReport;
use App\Modules\AI\Application\Commands\SummarizeDailyReportHandler;
use App\Modules\AI\Domain\AiSummary;
use App\Modules\AI\Domain\Exceptions\AiQuotaExceeded;
use App\Modules\AI\Domain\Exceptions\LlmCallFailed;
use App\Modules\AI\Http\Resources\AiSummaryResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;

final class SummaryController extends Controller
{
    public function __construct(
        private readonly SummarizeDailyReportHandler $dailyHandler,
        private readonly GenerateEvaluationNarrativeHandler $evalHandler,
    ) {}

    /**
     * GET /ai/summaries?subject_type=DailyReport&subject_id=...
     */
    public function index(Request $request): JsonResponse
    {
        $subjectType = $request->query('subject_type');
        $subjectId = $request->query('subject_id');

        $query = AiSummary::query();
        if ($subjectType) $query->where('subject_type', $subjectType);
        if ($subjectId) $query->where('subject_id', $subjectId);

        return response()->json([
            'data' => AiSummaryResource::collection($query->orderByDesc('created_at')->limit(50)->get()),
        ]);
    }

    /**
     * POST /ai/summaries/daily-report  { daily_report_id }
     * Genera bajo demanda (sync). Respeta quota.
     */
    public function summarizeDailyReport(Request $request): JsonResponse
    {
        $data = $request->validate([
            'daily_report_id' => ['required', 'uuid', 'exists:daily_reports,id'],
        ]);

        try {
            $summary = $this->dailyHandler->handle(new SummarizeDailyReport($data['daily_report_id']));
        } catch (AiQuotaExceeded|LlmCallFailed $e) {
            throw ValidationException::withMessages(['ai' => $e->getMessage()])->status(429);
        }

        if (!$summary) {
            return response()->json(['message' => 'Reporte insuficiente para resumir'], 422);
        }

        return response()->json([
            'data' => AiSummaryResource::make($summary)->resolve(),
        ], 201);
    }

    /**
     * POST /ai/summaries/evaluation-narrative  { evaluation_id }
     */
    public function evaluationNarrative(Request $request): JsonResponse
    {
        $data = $request->validate([
            'evaluation_id' => ['required', 'uuid', 'exists:evaluations,id'],
        ]);

        try {
            $summary = $this->evalHandler->handle(new GenerateEvaluationNarrative($data['evaluation_id']));
        } catch (AiQuotaExceeded|LlmCallFailed $e) {
            throw ValidationException::withMessages(['ai' => $e->getMessage()])->status(429);
        }

        return response()->json([
            'data' => AiSummaryResource::make($summary)->resolve(),
        ], 201);
    }

    public function approve(AiSummary $aiSummary, Request $request): JsonResponse
    {
        $aiSummary->approved_at = now();
        $aiSummary->approved_by = $request->user()->id;
        $aiSummary->save();

        return response()->json([
            'data' => AiSummaryResource::make($aiSummary)->resolve(),
        ]);
    }
}
