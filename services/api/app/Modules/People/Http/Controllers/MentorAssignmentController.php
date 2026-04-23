<?php

declare(strict_types=1);

namespace App\Modules\People\Http\Controllers;

use App\Modules\People\Application\Commands\AssignMentor;
use App\Modules\People\Application\Commands\AssignMentorHandler;
use App\Modules\People\Application\Commands\UnassignMentor;
use App\Modules\People\Application\Commands\UnassignMentorHandler;
use App\Modules\People\Domain\Exceptions\MentorCapacityExceeded;
use App\Modules\People\Domain\MentorAssignment;
use App\Modules\People\Http\Requests\AssignMentorRequest;
use App\Modules\People\Http\Resources\MentorAssignmentResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;

final class MentorAssignmentController extends Controller
{
    public function __construct(
        private readonly AssignMentorHandler $assignHandler,
        private readonly UnassignMentorHandler $unassignHandler,
    ) {}

    /**
     * GET /api/v1/mentor-assignments   filters: status, mentor_user_id, intern_user_id
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', MentorAssignment::class);

        $query = MentorAssignment::query()->with(['mentor', 'intern']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($mentor = $request->query('mentor_user_id')) {
            $query->where('mentor_user_id', $mentor);
        }
        if ($intern = $request->query('intern_user_id')) {
            $query->where('intern_user_id', $intern);
        }

        $items = $query->orderByDesc('started_at')->paginate(20);

        return response()->json([
            'data' => MentorAssignmentResource::collection($items),
            'meta' => [
                'total' => $items->total(),
                'per_page' => $items->perPage(),
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
            ],
        ]);
    }

    /**
     * POST /api/v1/mentor-assignments
     */
    public function store(AssignMentorRequest $request): JsonResponse
    {
        $this->authorize('create', MentorAssignment::class);

        try {
            $assignment = $this->assignHandler->handle(new AssignMentor(
                internUserId: $request->string('intern_user_id'),
                mentorUserId: $request->string('mentor_user_id'),
                actor: $request->user(),
                notes: $request->string('notes') ?: null,
            ));
        } catch (MentorCapacityExceeded $e) {
            throw ValidationException::withMessages([
                'mentor_user_id' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'data' => MentorAssignmentResource::make($assignment->fresh(['mentor', 'intern']))->resolve(),
        ], 201);
    }

    /**
     * DELETE /api/v1/mentor-assignments/{assignment}
     */
    public function destroy(MentorAssignment $assignment, Request $request): JsonResponse
    {
        $this->authorize('delete', $assignment);

        $ended = $this->unassignHandler->handle(new UnassignMentor(
            assignmentId: $assignment->id,
            actor: $request->user(),
        ));

        return response()->json([
            'data' => MentorAssignmentResource::make($ended->load(['mentor', 'intern']))->resolve(),
        ]);
    }
}
