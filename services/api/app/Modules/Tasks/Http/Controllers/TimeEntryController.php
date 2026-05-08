<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Controllers;

use App\Modules\Tasks\Application\Commands\AddManualTimeEntry;
use App\Modules\Tasks\Application\Commands\AddManualTimeEntryHandler;
use App\Modules\Tasks\Application\Commands\StartTimer;
use App\Modules\Tasks\Application\Commands\StartTimerHandler;
use App\Modules\Tasks\Application\Commands\StopTimer;
use App\Modules\Tasks\Application\Commands\StopTimerHandler;
use App\Modules\Tasks\Domain\Exceptions\TimerAlreadyRunning;
use App\Modules\Tasks\Domain\Task;
use App\Modules\Tasks\Domain\TimeEntry;
use App\Modules\Tasks\Http\Requests\ManualTimeEntryRequest;
use App\Modules\Tasks\Http\Resources\TimeEntryResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;

final class TimeEntryController extends Controller
{
    public function __construct(
        private readonly StartTimerHandler $startHandler,
        private readonly StopTimerHandler $stopHandler,
        private readonly AddManualTimeEntryHandler $manualHandler,
    ) {}

    public function indexForTask(Task $task, Request $request): JsonResponse
    {
        $this->authorize('view', $task);

        $entries = TimeEntry::query()
            ->where('task_id', $task->id)
            ->orderByDesc('started_at')
            ->paginate(50);

        return response()->json([
            'data' => TimeEntryResource::collection($entries),
            'meta' => [
                'total' => $entries->total(),
                'current_page' => $entries->currentPage(),
                'last_page' => $entries->lastPage(),
            ],
        ]);
    }

    public function running(Request $request): JsonResponse
    {
        $entry = TimeEntry::query()
            ->running()
            ->forUser($request->user()->id)
            ->latest('started_at')
            ->first();

        return response()->json([
            'data' => $entry ? TimeEntryResource::make($entry)->resolve() : null,
        ]);
    }

    public function start(Task $task, Request $request): JsonResponse
    {
        $this->authorize('view', $task);

        try {
            // `Request::string()` retorna Stringable; el command tipa ?string,
            // así que casteamos explícitamente para no chocar con el strict
            // type del constructor (mismo bug que ya arreglamos en reports).
            $entry = $this->startHandler->handle(new StartTimer(
                taskId: $task->id,
                user: $request->user(),
                note: $request->filled('note') ? (string) $request->string('note') : null,
            ));
        } catch (TimerAlreadyRunning $e) {
            throw ValidationException::withMessages(['timer' => $e->getMessage()]);
        }

        return response()->json([
            'data' => TimeEntryResource::make($entry)->resolve(),
        ], 201);
    }

    public function stop(TimeEntry $entry, Request $request): JsonResponse
    {
        $stopped = $this->stopHandler->handle(new StopTimer(
            timeEntryId: $entry->id,
            user: $request->user(),
            note: $request->filled('note') ? (string) $request->string('note') : null,
        ));

        return response()->json([
            'data' => TimeEntryResource::make($stopped)->resolve(),
        ]);
    }

    public function manual(Task $task, ManualTimeEntryRequest $request): JsonResponse
    {
        $this->authorize('view', $task);

        $entry = $this->manualHandler->handle(new AddManualTimeEntry(
            taskId: $task->id,
            user: $request->user(),
            startedAt: new \DateTimeImmutable((string) $request->string('started_at')),
            endedAt: new \DateTimeImmutable((string) $request->string('ended_at')),
            note: $request->filled('note') ? (string) $request->string('note') : null,
        ));

        return response()->json([
            'data' => TimeEntryResource::make($entry)->resolve(),
        ], 201);
    }
}
