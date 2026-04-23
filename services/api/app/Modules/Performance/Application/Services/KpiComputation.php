<?php

declare(strict_types=1);

namespace App\Modules\Performance\Application\Services;

use App\Modules\Performance\Domain\KpiSnapshot;
use App\Modules\Performance\Domain\ScorecardMetric;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;

/**
 * Calcula métricas automáticas de un user en un periodo.
 *
 * Soporta las métricas base del MVP. Fase 2 extiende vía `source` configurable.
 * Todas las consultas corren con el contexto del tenant activo (RLS aplica).
 */
final class KpiComputation
{
    /**
     * Métricas auto soportadas y cómo computarlas. Devuelve valor o null si no hay samples.
     */
    private const AUTO_METRICS = [
        'tasks_on_time' => [self::class, 'computeTasksOnTime'],
        'avg_review_score' => [self::class, 'computeAvgReviewScore'],
        'hours_logged' => [self::class, 'computeHoursLogged'],
        'tasks_completed' => [self::class, 'computeTasksCompleted'],
        'overdue_count' => [self::class, 'computeOverdueCount'],
    ];

    /**
     * @return array{value: ?float, sample_size: int}
     */
    public function compute(
        string $metricKey,
        string $subjectUserId,
        \DateTimeInterface $from,
        \DateTimeInterface $to,
    ): array {
        $fn = self::AUTO_METRICS[$metricKey] ?? null;
        if (!$fn) {
            return ['value' => null, 'sample_size' => 0];
        }
        return $fn($subjectUserId, $from, $to);
    }

    /**
     * @return array{value: ?float, sample_size: int}
     */
    private static function computeTasksOnTime(string $userId, \DateTimeInterface $from, \DateTimeInterface $to): array
    {
        $row = DB::table('tasks')
            ->where('assignee_id', $userId)
            ->whereIn('state', ['DONE'])
            ->whereBetween('completed_at', [$from, $to])
            ->whereNull('deleted_at')
            ->selectRaw('COUNT(*) as total, SUM(CASE WHEN due_at IS NULL OR completed_at <= due_at THEN 1 ELSE 0 END) as on_time')
            ->first();

        $total = (int) ($row->total ?? 0);
        if ($total === 0) {
            return ['value' => null, 'sample_size' => 0];
        }
        $onTime = (int) ($row->on_time ?? 0);
        return ['value' => round(($onTime / $total) * 100, 2), 'sample_size' => $total];
    }

    private static function computeAvgReviewScore(string $userId, \DateTimeInterface $from, \DateTimeInterface $to): array
    {
        // Proxy MVP: promedio de overall_score de evaluaciones submitted del periodo.
        $row = DB::table('evaluations')
            ->where('subject_user_id', $userId)
            ->whereIn('status', ['SUBMITTED', 'ACKNOWLEDGED', 'RESOLVED'])
            ->whereBetween('submitted_at', [$from, $to])
            ->whereNotNull('overall_score')
            ->selectRaw('AVG(overall_score) as avg, COUNT(*) as n')
            ->first();

        $n = (int) ($row->n ?? 0);
        return [
            'value' => $n > 0 ? round((float) $row->avg, 2) : null,
            'sample_size' => $n,
        ];
    }

    private static function computeHoursLogged(string $userId, \DateTimeInterface $from, \DateTimeInterface $to): array
    {
        $row = DB::table('time_entries')
            ->where('user_id', $userId)
            ->whereNotNull('ended_at')
            ->whereBetween('started_at', [$from, $to])
            ->selectRaw('COALESCE(SUM(duration_minutes), 0) as mins, COUNT(*) as n')
            ->first();

        $mins = (int) ($row->mins ?? 0);
        return [
            'value' => round($mins / 60, 2),
            'sample_size' => (int) ($row->n ?? 0),
        ];
    }

    private static function computeTasksCompleted(string $userId, \DateTimeInterface $from, \DateTimeInterface $to): array
    {
        $n = DB::table('tasks')
            ->where('assignee_id', $userId)
            ->where('state', 'DONE')
            ->whereBetween('completed_at', [$from, $to])
            ->whereNull('deleted_at')
            ->count();

        return ['value' => (float) $n, 'sample_size' => $n];
    }

    private static function computeOverdueCount(string $userId, \DateTimeInterface $from, \DateTimeInterface $to): array
    {
        $n = DB::table('tasks')
            ->where('assignee_id', $userId)
            ->whereNotIn('state', ['DONE', 'CANCELLED'])
            ->whereNotNull('due_at')
            ->whereBetween('due_at', [$from, $to])
            ->where('due_at', '<', now())
            ->whereNull('deleted_at')
            ->count();

        return ['value' => (float) $n, 'sample_size' => $n];
    }

    /**
     * Computa TODAS las métricas auto de un scorecard para un user + periodo.
     *
     * @return array<string, array{value: ?float, sample_size: int}>
     */
    public function computeAllForScorecard(
        string $scorecardId,
        string $subjectUserId,
        \DateTimeInterface $from,
        \DateTimeInterface $to,
    ): array {
        $keys = ScorecardMetric::query()
            ->where('scorecard_id', $scorecardId)
            ->where('type', 'auto')
            ->pluck('key');

        $out = [];
        foreach ($keys as $key) {
            $out[$key] = $this->compute($key, $subjectUserId, $from, $to);
        }
        return $out;
    }

    /**
     * Persiste un snapshot (reemplaza si ya existe por unique constraint).
     */
    public function captureSnapshot(
        string $subjectType,
        string $subjectId,
        string $metricKey,
        string $period,
        \DateTimeInterface $periodStart,
        \DateTimeInterface $periodEnd,
        float $value,
        ?int $sampleSize = null,
    ): KpiSnapshot {
        /** @var KpiSnapshot $snap */
        $snap = KpiSnapshot::query()->updateOrCreate(
            [
                'tenant_id' => TenantContext::currentId(),
                'subject_type' => $subjectType,
                'subject_id' => $subjectId,
                'metric_key' => $metricKey,
                'period' => $period,
                'period_start' => $periodStart,
            ],
            [
                'period_end' => $periodEnd,
                'value' => $value,
                'sample_size' => $sampleSize,
                'computed_at' => now(),
            ]
        );
        return $snap;
    }
}
