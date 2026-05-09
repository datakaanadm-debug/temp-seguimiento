<?php

declare(strict_types=1);

namespace App\Modules\Reports\Application\Services;

use App\Modules\Identity\Domain\User;
use App\Modules\People\Domain\InternData;
use App\Modules\People\Domain\Profile;
use App\Modules\Performance\Application\Services\KpiComputation;
use App\Modules\Tasks\Domain\Task;
use App\Modules\Tracking\Domain\DailyReport;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Construye el payload del reporte interno de un practicante.
 *
 * Subject = user_id del practicante. A diferencia del UniversityReport (que
 * genera la versión "oficial" para entregar al tutor académico), este es el
 * reporte de uso interno de RRHH/mentor: incluye más detalle operativo y
 * menos énfasis en convenios/horas obligatorias.
 *
 * Diferencias vs UniversityReportBuilder:
 *   - No requiere mandatory_hours/university_advisor para emitirse.
 *   - Incluye breakdown por proyecto + estado de bitácoras del periodo.
 *   - Lista mentores activos del practicante.
 *
 * Output va a la blade `reports.intern`.
 */
final class InternReportBuilder
{
    public function __construct(
        private readonly KpiComputation $kpi,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function build(
        string $internUserId,
        \DateTimeInterface $periodStart,
        \DateTimeInterface $periodEnd,
    ): array {
        /** @var User $user */
        $user = User::query()->findOrFail($internUserId);

        /** @var ?Profile $profile */
        $profile = Profile::query()->where('user_id', $internUserId)->first();

        /** @var ?InternData $internData */
        $internData = $profile
            ? InternData::query()->where('profile_id', $profile->id)->first()
            : null;

        $tenant = TenantContext::current();
        $tenantId = $tenant->id;

        // ── KPIs base reutilizando el servicio de Performance ────────────
        $kpis = [
            'tasks_on_time' => $this->kpi->compute('tasks_on_time', $internUserId, $periodStart, $periodEnd),
            'tasks_completed' => $this->kpi->compute('tasks_completed', $internUserId, $periodStart, $periodEnd),
            'hours_logged' => $this->kpi->compute('hours_logged', $internUserId, $periodStart, $periodEnd),
            'avg_review_score' => $this->kpi->compute('avg_review_score', $internUserId, $periodStart, $periodEnd),
            'overdue_count' => $this->kpi->compute('overdue_count', $internUserId, $periodStart, $periodEnd),
        ];

        // ── Bitácoras del periodo ────────────────────────────────────────
        $dailyAgg = DB::table('daily_reports')
            ->where('user_id', $internUserId)
            ->where('tenant_id', $tenantId)
            ->whereBetween('report_date', [$periodStart, $periodEnd])
            ->whereNull('deleted_at')
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN status='submitted' THEN 1 ELSE 0 END) as submitted,
                SUM(CASE WHEN status='reviewed' THEN 1 ELSE 0 END) as reviewed,
                SUM(CASE WHEN status='draft' THEN 1 ELSE 0 END) as draft,
                COALESCE(SUM(CASE WHEN status IN ('submitted','reviewed') THEN hours_worked ELSE 0 END), 0) as hours_logged
            ")
            ->first();

        // ── Breakdown por proyecto: # tareas DONE en periodo ─────────────
        $byProject = DB::table('tasks as t')
            ->join('projects as p', 'p.id', '=', 't.project_id')
            ->where('t.tenant_id', $tenantId)
            ->where('t.assignee_id', $internUserId)
            ->where('t.state', 'DONE')
            ->whereBetween('t.completed_at', [$periodStart, $periodEnd])
            ->whereNull('t.deleted_at')
            ->selectRaw('p.id, p.name, p.color, COUNT(*) as tasks_done')
            ->groupBy('p.id', 'p.name', 'p.color')
            ->orderByDesc('tasks_done')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'name' => $r->name,
                'color' => $r->color,
                'tasks_done' => (int) $r->tasks_done,
            ])
            ->all();

        // ── Tareas recientes (igual que university, sin límite tan estricto)
        $recentTasks = Task::query()
            ->where('assignee_id', $internUserId)
            ->whereBetween('updated_at', [$periodStart, $periodEnd])
            ->orderByDesc('completed_at')
            ->orderByDesc('updated_at')
            ->limit(15)
            ->get(['id', 'title', 'state', 'priority', 'due_at', 'completed_at']);

        // ── Mentores activos del practicante ─────────────────────────────
        $mentors = DB::table('mentor_assignments as ma')
            ->join('users as u', 'u.id', '=', 'ma.mentor_user_id')
            ->where('ma.tenant_id', $tenantId)
            ->where('ma.intern_user_id', $internUserId)
            ->where('ma.status', 'active')
            ->whereNull('ma.deleted_at')
            ->orderByDesc('ma.started_at')
            ->limit(5)
            ->get(['u.name', 'u.email', 'ma.started_at'])
            ->map(fn ($r) => [
                'name' => $r->name,
                'email' => $r->email,
                'started_at' => $r->started_at,
            ])
            ->all();

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
            'intern' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'university' => $internData?->university,
                'career' => $internData?->career,
                'semester' => $internData?->semester,
                'mandatory_hours' => $internData?->mandatory_hours,
                'hours_completed' => $internData?->hours_completed,
                'progress_percent' => $internData?->progressPercent(),
                'position_title' => $profile?->position_title,
                'start_date' => $profile?->start_date?->toDateString(),
            ],
            'period' => [
                'start' => $periodStart->format('Y-m-d'),
                'end' => $periodEnd->format('Y-m-d'),
                'days' => (int) round(
                    ($periodEnd->getTimestamp() - $periodStart->getTimestamp()) / 86400
                ),
            ],
            'kpis' => $kpis,
            'daily_reports' => [
                'total' => (int) ($dailyAgg->total ?? 0),
                'submitted' => (int) ($dailyAgg->submitted ?? 0),
                'reviewed' => (int) ($dailyAgg->reviewed ?? 0),
                'draft' => (int) ($dailyAgg->draft ?? 0),
                'hours_logged' => round((float) ($dailyAgg->hours_logged ?? 0), 1),
            ],
            'by_project' => $byProject,
            'mentors' => $mentors,
            'recent_tasks' => $recentTasks->map(fn (Task $t) => [
                'title' => $t->title,
                'state' => $t->state->value,
                'state_label' => $t->state->label(),
                'priority' => $t->priority->value,
                'due_at' => $t->due_at?->toDateString(),
                'completed_at' => $t->completed_at?->toDateString(),
            ])->all(),
            'generated_at' => now()->toIso8601String(),
        ];
    }
}
