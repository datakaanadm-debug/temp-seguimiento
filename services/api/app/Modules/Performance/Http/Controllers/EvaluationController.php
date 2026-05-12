<?php

declare(strict_types=1);

namespace App\Modules\Performance\Http\Controllers;

use App\Modules\Performance\Application\Commands\AcknowledgeEvaluation;
use App\Modules\Performance\Application\Commands\AcknowledgeEvaluationHandler;
use App\Modules\Performance\Application\Commands\AssignEvaluator;
use App\Modules\Performance\Application\Commands\AssignEvaluatorHandler;
use App\Modules\Performance\Application\Commands\CancelEvaluation;
use App\Modules\Performance\Application\Commands\CancelEvaluationHandler;
use App\Modules\Performance\Application\Commands\DisputeEvaluation;
use App\Modules\Performance\Application\Commands\DisputeEvaluationHandler;
use App\Modules\Performance\Application\Commands\ResolveDispute;
use App\Modules\Performance\Application\Commands\ResolveDisputeHandler;
use App\Modules\Performance\Application\Commands\SaveEvaluationResponses;
use App\Modules\Performance\Application\Commands\SaveEvaluationResponsesHandler;
use App\Modules\Performance\Application\Commands\ScheduleEvaluation;
use App\Modules\Performance\Application\Commands\ScheduleEvaluationHandler;
use App\Modules\Performance\Application\Commands\SubmitEvaluation;
use App\Modules\Performance\Application\Commands\SubmitEvaluationHandler;
use App\Modules\Performance\Domain\Evaluation;
use App\Modules\Performance\Domain\Exceptions\InvalidEvaluationTransition;
use App\Modules\Performance\Http\Requests\SaveResponsesRequest;
use App\Modules\Performance\Http\Requests\ScheduleEvaluationRequest;
use App\Modules\Performance\Http\Resources\EvaluationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;

final class EvaluationController extends Controller
{
    public function __construct(
        private readonly ScheduleEvaluationHandler $scheduleHandler,
        private readonly SaveEvaluationResponsesHandler $saveHandler,
        private readonly SubmitEvaluationHandler $submitHandler,
        private readonly AcknowledgeEvaluationHandler $ackHandler,
        private readonly DisputeEvaluationHandler $disputeHandler,
        private readonly ResolveDisputeHandler $resolveHandler,
        private readonly CancelEvaluationHandler $cancelHandler,
        private readonly AssignEvaluatorHandler $assignHandler,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Evaluation::class);

        $query = Evaluation::query()->with(['subject', 'evaluator']);

        if ($subject = $request->query('subject_user_id')) {
            $query->where('subject_user_id', $subject);
        }
        if ($evaluator = $request->query('evaluator_user_id')) {
            $query->where('evaluator_user_id', $evaluator);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($kind = $request->query('kind')) {
            $query->where('kind', $kind);
        }
        if ($request->boolean('mine')) {
            $query->where(fn ($q) => $q
                ->where('subject_user_id', $request->user()->id)
                ->orWhere('evaluator_user_id', $request->user()->id));
        }

        $items = $query
            ->orderByDesc('scheduled_for')
            ->paginate((int) $request->integer('per_page', 30));

        return response()->json([
            'data' => EvaluationResource::collection($items),
            'meta' => [
                'total' => $items->total(),
                'per_page' => $items->perPage(),
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
            ],
        ]);
    }

    public function show(Evaluation $evaluation): JsonResponse
    {
        $this->authorize('view', $evaluation);
        $evaluation->load(['subject', 'evaluator', 'scorecard.metrics', 'responses.metric']);

        return response()->json([
            'data' => EvaluationResource::make($evaluation)->resolve(),
        ]);
    }

    public function store(ScheduleEvaluationRequest $request): JsonResponse
    {
        $this->authorize('create', Evaluation::class);

        $evaluation = $this->scheduleHandler->handle(new ScheduleEvaluation(
            scorecardId: $request->string('scorecard_id'),
            subjectUserId: $request->string('subject_user_id'),
            evaluatorUserId: $request->string('evaluator_user_id') ?: null,
            kind: $request->string('kind'),
            scheduledFor: $request->string('scheduled_for'),
            actor: $request->user(),
        ));

        return response()->json([
            'data' => EvaluationResource::make($evaluation->fresh(['subject', 'evaluator']))->resolve(),
        ], 201);
    }

    /**
     * PUT /evaluations/{id}/responses
     */
    public function saveResponses(Evaluation $evaluation, SaveResponsesRequest $request): JsonResponse
    {
        $this->authorize('evaluate', $evaluation);

        $updated = $this->saveHandler->handle(new SaveEvaluationResponses(
            evaluationId: $evaluation->id,
            evaluator: $request->user(),
            responses: (array) $request->input('responses', []),
            narrative: $request->string('narrative') ?: null,
            overallScore: $request->has('overall_score') ? (float) $request->input('overall_score') : null,
        ));

        return response()->json([
            'data' => EvaluationResource::make($updated)->resolve(),
        ]);
    }

    public function submit(Evaluation $evaluation, Request $request): JsonResponse
    {
        $this->authorize('evaluate', $evaluation);

        try {
            $submitted = $this->submitHandler->handle(new SubmitEvaluation(
                evaluationId: $evaluation->id,
                evaluator: $request->user(),
            ));
        } catch (InvalidEvaluationTransition $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return response()->json([
            'data' => EvaluationResource::make($submitted)->resolve(),
        ]);
    }

    public function acknowledge(Evaluation $evaluation, Request $request): JsonResponse
    {
        $this->authorize('acknowledge', $evaluation);

        try {
            $acked = $this->ackHandler->handle(new AcknowledgeEvaluation(
                evaluationId: $evaluation->id,
                subject: $request->user(),
            ));
        } catch (InvalidEvaluationTransition $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return response()->json([
            'data' => EvaluationResource::make($acked)->resolve(),
        ]);
    }

    /**
     * POST /evaluations/{id}/dispute
     * Body: { reason?: string }
     * Sólo el sujeto evaluado puede disputar, y sólo en estado SUBMITTED.
     */
    public function dispute(Evaluation $evaluation, Request $request): JsonResponse
    {
        $this->authorize('dispute', $evaluation);

        $reason = $request->input('reason');
        if (is_string($reason)) {
            $request->validate(['reason' => ['nullable', 'string', 'max:2000']]);
        }

        try {
            $disputed = $this->disputeHandler->handle(new DisputeEvaluation(
                evaluationId: $evaluation->id,
                subject: $request->user(),
                reason: is_string($reason) ? trim($reason) : null,
            ));
        } catch (InvalidEvaluationTransition $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return response()->json([
            'data' => EvaluationResource::make($disputed)->resolve(),
        ]);
    }

    /**
     * POST /evaluations/{id}/resolve
     * Body: { resolution?: string }
     * Admin/HR cierra la disputa con una nota de resolución.
     */
    public function resolve(Evaluation $evaluation, Request $request): JsonResponse
    {
        $this->authorize('resolve', $evaluation);

        $request->validate(['resolution' => ['nullable', 'string', 'max:2000']]);

        try {
            $resolved = $this->resolveHandler->handle(new ResolveDispute(
                evaluationId: $evaluation->id,
                resolver: $request->user(),
                resolution: $request->input('resolution') ?: null,
            ));
        } catch (InvalidEvaluationTransition $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return response()->json([
            'data' => EvaluationResource::make($resolved)->resolve(),
        ]);
    }

    /**
     * POST /evaluations/{id}/cancel
     * Body: { reason?: string }
     * Sólo válido en SCHEDULED o IN_PROGRESS.
     */
    public function cancel(Evaluation $evaluation, Request $request): JsonResponse
    {
        $this->authorize('cancel', $evaluation);

        $request->validate(['reason' => ['nullable', 'string', 'max:2000']]);

        try {
            $cancelled = $this->cancelHandler->handle(new CancelEvaluation(
                evaluationId: $evaluation->id,
                actor: $request->user(),
                reason: $request->input('reason') ?: null,
            ));
        } catch (InvalidEvaluationTransition $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return response()->json([
            'data' => EvaluationResource::make($cancelled)->resolve(),
        ]);
    }

    /**
     * PATCH /evaluations/{id}/assign
     * Body: { evaluator_user_id: string|null }
     * Reasigna (o desasigna con null) el evaluador antes de enviar.
     */
    public function assign(Evaluation $evaluation, Request $request): JsonResponse
    {
        $this->authorize('assign', $evaluation);

        $validated = $request->validate([
            'evaluator_user_id' => ['nullable', 'string', 'uuid'],
        ]);

        try {
            $updated = $this->assignHandler->handle(new AssignEvaluator(
                evaluationId: $evaluation->id,
                actor: $request->user(),
                evaluatorUserId: $validated['evaluator_user_id'] ?? null,
            ));
        } catch (InvalidEvaluationTransition $e) {
            throw ValidationException::withMessages(['evaluator_user_id' => $e->getMessage()]);
        }

        return response()->json([
            'data' => EvaluationResource::make($updated)->resolve(),
        ]);
    }
}
