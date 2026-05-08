<?php

declare(strict_types=1);

namespace App\Modules\Reports\Application\Services;

use App\Modules\Organization\Domain\Team;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Construye el payload del reporte de equipo.
 *
 * Subject = team_id. Se invoca pasando el ID del Team y un periodo.
 * Pensado para team leads / RRHH que quieren auditar el cumplimiento
 * de un equipo concreto sin tener que armar la tabla a mano.
 *
 * Métricas:
 *   - Header del team: nombre, área, lead, miembros activos
 *   - Tabla de miembros con tareas DONE / overdue / horas en periodo
 *   - Tareas cerradas por el team (conjunto, no per-user) con due/done
 *   - OKRs vinculados (owner_type=team) con progress de KRs
 *
 * Output va a la blade `reports.team`.
 */
final class TeamReportBuilder
{
    /**
     * @return array<string, mixed>
     */
    public function build(
        string $teamId,
        \DateTimeInterface $periodStart,
        \DateTimeInterface $periodEnd,
    ): array {
        $tenant = TenantContext::current();
        $tenantId = $tenant->id;

        /** @var Team $team */
        $team = Team::query()
            ->with(['area', 'lead'])
            ->where('id', $teamId)
            ->where('tenant_id', $tenantId)
            ->firstOrFail();

        // ── Miembros activos del equipo ──────────────────────────────────
        $memberRows = DB::table('team_memberships as tm')
            ->join('users as u', 'u.id', '=', 'tm.user_id')
            ->where('tm.team_id', $team->id)
            ->where('tm.tenant_id', $tenantId)
            ->whereNull('tm.left_at')
            ->select('u.id as user_id', 'u.name', 'u.email', 'tm.role', 'tm.joined_at')
            ->orderBy('u.name')
            ->get();

        $members = $memberRows->map(function ($m) use ($tenantId, $periodStart, $periodEnd) {
            // Tareas DONE en periodo
            $tasksRow = DB::table('tasks')
                ->where('tenant_id', $tenantId)
                ->where('assignee_id', $m->user_id)
                ->where('state', 'DONE')
                ->whereBetween('completed_at', [$periodStart, $periodEnd])
                ->whereNull('deleted_at')
                ->selectRaw('COUNT(*) as total, SUM(CASE WHEN due_at IS NULL OR completed_at <= due_at THEN 1 ELSE 0 END) as on_time')
                ->first();
            $tasksDone = (int) ($tasksRow->total ?? 0);
            $onTime = (int) ($tasksRow->on_time ?? 0);

            // Vencidas activas (no completadas, fecha < hoy)
            $overdue = (int) DB::table('tasks')
                ->where('tenant_id', $tenantId)
                ->where('assignee_id', $m->user_id)
                ->whereNotIn('state', ['DONE', 'CANCELLED'])
                ->whereNotNull('due_at')
                ->where('due_at', '<', now())
                ->whereNull('deleted_at')
                ->count();

            // Horas reportadas en bitácoras del periodo
            $hours = (float) DB::table('daily_reports')
                ->where('tenant_id', $tenantId)
                ->where('user_id', $m->user_id)
                ->whereIn('status', ['submitted', 'reviewed'])
                ->whereBetween('report_date', [$periodStart, $periodEnd])
                ->whereNull('deleted_at')
                ->sum('hours_worked');

            return [
                'user_id' => $m->user_id,
                'name' => $m->name,
                'email' => $m->email,
                'role' => $m->role,
                'joined_at' => $m->joined_at,
                'tasks_done' => $tasksDone,
                'tasks_on_time_percent' => $tasksDone > 0
                    ? round(($onTime / $tasksDone) * 100, 1)
                    : null,
                'tasks_overdue' => $overdue,
                'hours' => round($hours, 1),
            ];
        })->all();

        // ── Tareas del equipo (assignee ∈ miembros, periodo) ─────────────
        $memberIds = $memberRows->pluck('user_id')->all();
        $teamTasks = [];
        $teamTotalsRow = (object) ['done' => 0, 'overdue' => 0, 'in_progress' => 0];

        if (count($memberIds) > 0) {
            $teamTasks = DB::table('tasks')
                ->where('tenant_id', $tenantId)
                ->whereIn('assignee_id', $memberIds)
                ->whereBetween('updated_at', [$periodStart, $periodEnd])
                ->whereNull('deleted_at')
                ->orderByDesc('completed_at')
                ->orderByDesc('updated_at')
                ->limit(30)
                ->get(['id', 'title', 'state', 'priority', 'due_at', 'completed_at', 'assignee_id'])
                ->map(fn ($t) => [
                    'title' => $t->title,
                    'state' => $t->state,
                    'priority' => $t->priority,
                    'due_at' => $t->due_at ? \Carbon\Carbon::parse($t->due_at)->toDateString() : null,
                    'completed_at' => $t->completed_at ? \Carbon\Carbon::parse($t->completed_at)->toDateString() : null,
                    'assignee_id' => $t->assignee_id,
                ])
                ->all();

            $teamTotalsRow = DB::table('tasks')
                ->where('tenant_id', $tenantId)
                ->whereIn('assignee_id', $memberIds)
                ->whereNull('deleted_at')
                ->selectRaw("
                    SUM(CASE WHEN state='DONE' AND completed_at BETWEEN ? AND ? THEN 1 ELSE 0 END) as done,
                    SUM(CASE WHEN state NOT IN ('DONE','CANCELLED') AND due_at < NOW() THEN 1 ELSE 0 END) as overdue,
                    SUM(CASE WHEN state IN ('IN_PROGRESS','IN_REVIEW') THEN 1 ELSE 0 END) as in_progress
                ", [$periodStart, $periodEnd])
                ->first();
        }

        // ── OKRs cuyo owner es este team ─────────────────────────────────
        $okrs = DB::table('objectives as o')
            ->where('o.tenant_id', $tenantId)
            ->where('o.owner_type', 'team')
            ->where('o.owner_id', $team->id)
            ->orderByDesc('o.starts_at')
            ->limit(10)
            ->get(['o.id', 'o.label', 'o.quarter', 'o.status']);

        $okrsWithKrs = $okrs->map(function ($obj) use ($tenantId) {
            $krs = DB::table('key_results')
                ->where('tenant_id', $tenantId)
                ->where('objective_id', $obj->id)
                ->orderBy('position')
                ->get(['text', 'progress_percent', 'confidence', 'unit', 'target_value', 'current_value']);

            $avgProgress = $krs->avg('progress_percent');

            return [
                'label' => $obj->label,
                'quarter' => $obj->quarter,
                'status' => $obj->status,
                'avg_progress' => $avgProgress !== null ? round((float) $avgProgress, 1) : null,
                'key_results' => $krs->map(fn ($kr) => [
                    'text' => $kr->text,
                    'progress_percent' => (int) $kr->progress_percent,
                    'confidence' => (int) $kr->confidence,
                    'unit' => $kr->unit,
                    'current_value' => $kr->current_value,
                    'target_value' => $kr->target_value,
                ])->all(),
            ];
        })->all();

        // ── Logo inline para dompdf ──────────────────────────────────────
        $theme = (array) ($tenant->theme ?? []);
        if (!empty($theme['logo_key']) && Storage::exists((string) $theme['logo_key'])) {
            $bytes = Storage::get((string) $theme['logo_key']);
            $mime = (string) ($theme['logo_mime'] ?? 'image/png');
            $theme['logo_url'] = 'data:' . $mime . ';base64,' . base64_encode($bytes);
        }

        return [
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'theme' => $theme,
            ],
            'team' => [
                'id' => $team->id,
                'name' => $team->name,
                'slug' => $team->slug,
                'color' => $team->color,
                'area_name' => $team->area?->name,
                'lead_name' => $team->lead?->name,
                'members_count' => $memberRows->count(),
            ],
            'period' => [
                'start' => $periodStart->format('Y-m-d'),
                'end' => $periodEnd->format('Y-m-d'),
                'days' => (int) round(
                    ($periodEnd->getTimestamp() - $periodStart->getTimestamp()) / 86400
                ),
            ],
            'members' => $members,
            'team_totals' => [
                'tasks_done' => (int) ($teamTotalsRow->done ?? 0),
                'tasks_overdue' => (int) ($teamTotalsRow->overdue ?? 0),
                'tasks_in_progress' => (int) ($teamTotalsRow->in_progress ?? 0),
            ],
            'recent_tasks' => $teamTasks,
            'okrs' => $okrsWithKrs,
            'generated_at' => now()->toIso8601String(),
        ];
    }
}
