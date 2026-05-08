<?php

declare(strict_types=1);

namespace App\Modules\Reports\Application\Services;

use App\Modules\Identity\Domain\User;
use App\Modules\Performance\Application\Services\KpiComputation;
use App\Modules\People\Domain\InternData;
use App\Modules\People\Domain\Profile;
use App\Modules\Tasks\Domain\Task;
use App\Modules\Tracking\Domain\DailyReport;
use App\Shared\Tenancy\TenantContext;

/**
 * Construye el payload del reporte universitario para un practicante y periodo.
 *
 * Output es un array que la view `reports.university` espera.
 * No renderiza PDF aquí; solo junta data.
 */
final class UniversityReportBuilder
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

        $kpis = [
            'tasks_on_time' => $this->kpi->compute('tasks_on_time', $internUserId, $periodStart, $periodEnd),
            'tasks_completed' => $this->kpi->compute('tasks_completed', $internUserId, $periodStart, $periodEnd),
            'hours_logged' => $this->kpi->compute('hours_logged', $internUserId, $periodStart, $periodEnd),
            'avg_review_score' => $this->kpi->compute('avg_review_score', $internUserId, $periodStart, $periodEnd),
            'overdue_count' => $this->kpi->compute('overdue_count', $internUserId, $periodStart, $periodEnd),
        ];

        $dailyReportsCount = DailyReport::query()
            ->where('user_id', $internUserId)
            ->whereBetween('report_date', [$periodStart, $periodEnd])
            ->count();

        $recentTasks = Task::query()
            ->where('assignee_id', $internUserId)
            ->whereBetween('updated_at', [$periodStart, $periodEnd])
            ->orderByDesc('completed_at')
            ->orderByDesc('updated_at')
            ->limit(20)
            ->get(['id', 'title', 'state', 'priority', 'due_at', 'completed_at', 'estimated_minutes', 'actual_minutes']);

        $tenant = TenantContext::current();

        // Inline el logo como data: URI para que dompdf no tenga que hacer
        // un fetch HTTP (isRemoteEnabled=false por defecto). Leemos el archivo
        // directo del storage usando logo_key y lo codificamos base64.
        $theme = (array) ($tenant->theme ?? []);
        if (!empty($theme['logo_key']) && \Illuminate\Support\Facades\Storage::exists((string) $theme['logo_key'])) {
            $bytes = \Illuminate\Support\Facades\Storage::get((string) $theme['logo_key']);
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
                'university_advisor' => $internData?->university_advisor,
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
            'daily_reports_count' => $dailyReportsCount,
            'recent_tasks' => $recentTasks->map(fn (Task $t) => [
                'title' => $t->title,
                'state' => $t->state->value,
                'state_label' => $t->state->label(),
                'priority' => $t->priority->value,
                'due_at' => $t->due_at?->toDateString(),
                'completed_at' => $t->completed_at?->toDateString(),
                'estimated_minutes' => $t->estimated_minutes,
                'actual_minutes' => $t->actual_minutes,
            ])->all(),
            'generated_at' => now()->toIso8601String(),
        ];
    }
}
