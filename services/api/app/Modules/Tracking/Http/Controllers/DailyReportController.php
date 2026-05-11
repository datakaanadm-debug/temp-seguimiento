<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Http\Controllers;

use App\Modules\Tracking\Application\Commands\ReviewDailyReport;
use App\Modules\Tracking\Application\Commands\ReviewDailyReportHandler;
use App\Modules\Tracking\Application\Commands\UpsertDailyReport;
use App\Modules\Tracking\Application\Commands\UpsertDailyReportHandler;
use App\Modules\Tracking\Domain\DailyReport;
use App\Modules\Tracking\Http\Requests\UpsertDailyReportRequest;
use App\Modules\Tracking\Http\Resources\DailyReportResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

final class DailyReportController extends Controller
{
    public function __construct(
        private readonly UpsertDailyReportHandler $upsertHandler,
        private readonly ReviewDailyReportHandler $reviewHandler,
    ) {}

    /**
     * GET /daily-reports   filters: ?user_id= &from= &to= &status=
     * Defaults: sin user_id, retorna los del user autenticado.
     */
    public function index(Request $request): JsonResponse
    {
        $query = DailyReport::query()->with(['user', 'blockers']);

        // RBAC: si se pide ?user_id=otro, solo admin/HR/mentor (con asignación
        // al intern) o team_lead (con el intern en su team) pueden ver. Antes
        // cualquiera podía consultar bitácoras de otro user pasando user_id.
        $actor = $request->user();
        $userId = (string) $request->query('user_id', $actor->id);

        if ($userId !== $actor->id) {
            $role = $actor->primaryRole();
            $canViewOthers = in_array($role, [
                \App\Modules\Identity\Domain\Enums\MembershipRole::TenantAdmin,
                \App\Modules\Identity\Domain\Enums\MembershipRole::HR,
            ], true);

            // Mentor del intern (mentor_assignments activos)
            if (!$canViewOthers && $role === \App\Modules\Identity\Domain\Enums\MembershipRole::Mentor) {
                $canViewOthers = \Illuminate\Support\Facades\DB::table('mentor_assignments')
                    ->where('mentor_user_id', $actor->id)
                    ->where('intern_user_id', $userId)
                    ->where('status', 'active')
                    ->whereNull('deleted_at')
                    ->exists();
            }

            // Team lead del intern
            if (!$canViewOthers && $role === \App\Modules\Identity\Domain\Enums\MembershipRole::TeamLead) {
                $canViewOthers = \Illuminate\Support\Facades\DB::table('team_memberships as tm')
                    ->join('teams as t', 't.id', '=', 'tm.team_id')
                    ->where('tm.user_id', $userId)
                    ->where('t.lead_user_id', $actor->id)
                    ->whereNull('tm.left_at')
                    ->exists();
            }

            if (!$canViewOthers) {
                abort(403, 'No tienes permiso para ver bitácoras de otros usuarios.');
            }
        }

        $query->forUser($userId);

        if ($from = $request->query('from')) {
            $query->where('report_date', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $query->where('report_date', '<=', $to);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $reports = $query
            ->orderByDesc('report_date')
            ->paginate((int) $request->integer('per_page', 30));

        return response()->json([
            'data' => DailyReportResource::collection($reports),
            'meta' => [
                'total' => $reports->total(),
                'per_page' => $reports->perPage(),
                'current_page' => $reports->currentPage(),
                'last_page' => $reports->lastPage(),
            ],
        ]);
    }

    public function show(DailyReport $dailyReport): JsonResponse
    {
        $this->authorize('view', $dailyReport);
        $dailyReport->load(['user', 'blockers.raiser']);

        return response()->json([
            'data' => DailyReportResource::make($dailyReport)->resolve(),
        ]);
    }

    public function today(Request $request): JsonResponse
    {
        $today = now()->toDateString();
        $report = DailyReport::query()
            ->forUser($request->user()->id)
            ->where('report_date', $today)
            ->with(['blockers'])
            ->first();

        return response()->json([
            'data' => $report ? DailyReportResource::make($report)->resolve() : null,
        ]);
    }

    /**
     * PUT /daily-reports (upsert por user + fecha)
     */
    public function upsert(UpsertDailyReportRequest $request): JsonResponse
    {
        $report = $this->upsertHandler->handle(new UpsertDailyReport(
            user: $request->user(),
            reportDate: (string) $request->string('report_date', now()->toDateString()),
            progressSummary: (string) $request->string('progress_summary'),
            submit: (bool) $request->boolean('submit', true),
            blockersText: $request->filled('blockers_text') ? (string) $request->string('blockers_text') : null,
            planTomorrow: $request->filled('plan_tomorrow') ? (string) $request->string('plan_tomorrow') : null,
            mood: $request->filled('mood') ? (string) $request->string('mood') : null,
            hoursWorked: $request->has('hours_worked') ? (float) $request->input('hours_worked') : null,
        ));

        return response()->json([
            'data' => DailyReportResource::make($report->load(['user', 'blockers']))->resolve(),
        ], $report->wasRecentlyCreated ? 201 : 200);
    }

    public function review(DailyReport $dailyReport, Request $request): JsonResponse
    {
        $this->authorize('review', $dailyReport);

        $reviewed = $this->reviewHandler->handle(new ReviewDailyReport(
            reportId: $dailyReport->id,
            reviewer: $request->user(),
        ));

        return response()->json([
            'data' => DailyReportResource::make($reviewed->load(['user', 'blockers']))->resolve(),
        ]);
    }
}
