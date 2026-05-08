<?php

declare(strict_types=1);

namespace App\Modules\Reports\Application\Services;

use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Construye el payload del reporte ejecutivo a nivel tenant.
 *
 * No tiene "subject" — agrega métricas de TODO el programa de prácticas
 * dentro del periodo dado. Pensado para sponsors / dirección que quieren
 * ver el pulso del programa en una página.
 *
 * Métricas:
 *   - Headcount: practicantes activos, mentores asignados, ratio
 *   - Cumplimiento: tareas completadas, atrasadas, % a tiempo
 *   - Horas: total acumulado en bitácoras submitted/reviewed
 *   - Evaluación: avg overall_score (con muestra)
 *   - Top 5 performers: practicantes por tasks_completed + on-time
 *   - Riesgos: practicantes con ≥3 tareas vencidas activas
 *
 * Output va a la blade `reports.executive`.
 */
final class ExecutiveReportBuilder
{
    /**
     * @return array<string, mixed>
     */
    public function build(
        \DateTimeInterface $periodStart,
        \DateTimeInterface $periodEnd,
    ): array {
        $tenant = TenantContext::current();
        $tenantId = $tenant->id;

        // ── Headcount ────────────────────────────────────────────────────
        $activeInterns = (int) DB::table('profiles')
            ->where('tenant_id', $tenantId)
            ->where('kind', 'intern')
            ->whereNull('deleted_at')
            ->count();

        $activeMentors = (int) DB::table('profiles')
            ->where('tenant_id', $tenantId)
            ->where('kind', 'mentor')
            ->whereNull('deleted_at')
            ->count();

        $assignmentsActive = (int) DB::table('mentor_assignments')
            ->where('tenant_id', $tenantId)
            ->whereNull('ended_at')
            ->whereNull('deleted_at')
            ->count();

        // ── Cumplimiento de tareas ───────────────────────────────────────
        $tasksRow = DB::table('tasks')
            ->where('tenant_id', $tenantId)
            ->where('state', 'DONE')
            ->whereBetween('completed_at', [$periodStart, $periodEnd])
            ->whereNull('deleted_at')
            ->selectRaw('COUNT(*) as total, SUM(CASE WHEN due_at IS NULL OR completed_at <= due_at THEN 1 ELSE 0 END) as on_time')
            ->first();

        $tasksCompleted = (int) ($tasksRow->total ?? 0);
        $tasksOnTime = (int) ($tasksRow->on_time ?? 0);
        $onTimePercent = $tasksCompleted > 0
            ? round(($tasksOnTime / $tasksCompleted) * 100, 1)
            : null;

        $tasksOverdue = (int) DB::table('tasks')
            ->where('tenant_id', $tenantId)
            ->whereNotIn('state', ['DONE', 'CANCELLED'])
            ->whereNotNull('due_at')
            ->where('due_at', '<', now())
            ->whereNull('deleted_at')
            ->count();

        // ── Horas acumuladas en periodo (daily_reports submitted/reviewed) ─
        $hoursTotal = (float) DB::table('daily_reports')
            ->where('tenant_id', $tenantId)
            ->whereIn('status', ['submitted', 'reviewed'])
            ->whereBetween('report_date', [$periodStart, $periodEnd])
            ->whereNull('deleted_at')
            ->sum('hours_worked');

        $reportsSubmitted = (int) DB::table('daily_reports')
            ->where('tenant_id', $tenantId)
            ->whereIn('status', ['submitted', 'reviewed'])
            ->whereBetween('report_date', [$periodStart, $periodEnd])
            ->whereNull('deleted_at')
            ->count();

        // ── Evaluaciones promedio ────────────────────────────────────────
        $evalRow = DB::table('evaluations')
            ->where('tenant_id', $tenantId)
            ->whereIn('status', ['SUBMITTED', 'ACKNOWLEDGED', 'RESOLVED'])
            ->whereBetween('submitted_at', [$periodStart, $periodEnd])
            ->whereNotNull('overall_score')
            ->selectRaw('AVG(overall_score) as avg, COUNT(*) as n')
            ->first();

        $avgEvaluation = $evalRow && $evalRow->n > 0
            ? round((float) $evalRow->avg, 2)
            : null;
        $evalSampleSize = (int) ($evalRow->n ?? 0);

        // ── Top performers (por tasks_completed con peso por on-time) ────
        // Ranking simple: # tareas DONE en periodo, desempate por on-time%.
        $topPerformers = DB::table('tasks as t')
            ->join('users as u', 'u.id', '=', 't.assignee_id')
            ->join('profiles as p', function ($j) use ($tenantId) {
                $j->on('p.user_id', '=', 'u.id')
                    ->where('p.tenant_id', '=', $tenantId)
                    ->where('p.kind', '=', 'intern')
                    ->whereNull('p.deleted_at');
            })
            ->where('t.tenant_id', $tenantId)
            ->where('t.state', 'DONE')
            ->whereBetween('t.completed_at', [$periodStart, $periodEnd])
            ->whereNull('t.deleted_at')
            ->selectRaw('
                u.id as user_id,
                u.name as name,
                COUNT(*) as tasks_done,
                SUM(CASE WHEN t.due_at IS NULL OR t.completed_at <= t.due_at THEN 1 ELSE 0 END) as on_time
            ')
            ->groupBy('u.id', 'u.name')
            ->orderByDesc('tasks_done')
            ->orderByDesc('on_time')
            ->limit(5)
            ->get()
            ->map(function ($r) {
                $tasks = (int) $r->tasks_done;
                $onTime = (int) $r->on_time;
                return [
                    'user_id' => $r->user_id,
                    'name' => $r->name,
                    'tasks_done' => $tasks,
                    'on_time_percent' => $tasks > 0 ? round(($onTime / $tasks) * 100, 1) : null,
                ];
            })
            ->all();

        // ── Riesgos: practicantes con ≥3 tareas vencidas activas ─────────
        $risks = DB::table('tasks as t')
            ->join('users as u', 'u.id', '=', 't.assignee_id')
            ->join('profiles as p', function ($j) use ($tenantId) {
                $j->on('p.user_id', '=', 'u.id')
                    ->where('p.tenant_id', '=', $tenantId)
                    ->where('p.kind', '=', 'intern')
                    ->whereNull('p.deleted_at');
            })
            ->where('t.tenant_id', $tenantId)
            ->whereNotIn('t.state', ['DONE', 'CANCELLED'])
            ->whereNotNull('t.due_at')
            ->where('t.due_at', '<', now())
            ->whereNull('t.deleted_at')
            ->selectRaw('u.id as user_id, u.name as name, COUNT(*) as overdue_count')
            ->groupBy('u.id', 'u.name')
            ->having(DB::raw('COUNT(*)'), '>=', 3)
            ->orderByDesc('overdue_count')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'user_id' => $r->user_id,
                'name' => $r->name,
                'overdue_count' => (int) $r->overdue_count,
            ])
            ->all();

        // ── Logo del tenant inline (igual que university) ────────────────
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
            'period' => [
                'start' => $periodStart->format('Y-m-d'),
                'end' => $periodEnd->format('Y-m-d'),
                'days' => (int) round(
                    ($periodEnd->getTimestamp() - $periodStart->getTimestamp()) / 86400
                ),
            ],
            'headcount' => [
                'active_interns' => $activeInterns,
                'active_mentors' => $activeMentors,
                'assignments_active' => $assignmentsActive,
                'mentor_to_intern_ratio' => $activeInterns > 0
                    ? round($activeMentors / $activeInterns, 2)
                    : null,
            ],
            'tasks' => [
                'completed' => $tasksCompleted,
                'on_time_percent' => $onTimePercent,
                'overdue_active' => $tasksOverdue,
            ],
            'tracking' => [
                'hours_total' => round($hoursTotal, 1),
                'reports_submitted' => $reportsSubmitted,
            ],
            'evaluation' => [
                'avg_score' => $avgEvaluation,
                'sample_size' => $evalSampleSize,
            ],
            'top_performers' => $topPerformers,
            'risks' => $risks,
            'generated_at' => now()->toIso8601String(),
        ];
    }
}
