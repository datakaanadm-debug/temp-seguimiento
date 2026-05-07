<?php

declare(strict_types=1);

namespace App\Modules\Analytics\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * GET /api/v1/analytics/activity-heatmap?days=30&tz=America/Mexico_City
 *
 * Devuelve la actividad agregada en buckets (weekday, hour) durante los
 * últimos N días. Permite construir un heatmap 7×24 en frontend.
 *
 * Fuentes (UNION ALL):
 *   · daily_reports.created_at  → cuando se inició/escribió el reporte
 *   · comments.created_at       → comentarios en tareas
 *   · tasks.completed_at        → cuando se cerró una tarea
 *   · time_entries.started_at   → bloques de tiempo activo
 *
 * Tenant isolation: RLS está activo en estas tablas por
 * `current_setting('app.tenant_id')`. Igual filtramos explícitamente
 * por defensa en profundidad.
 *
 * Response shape:
 *   {
 *     days: 30,
 *     timezone: 'America/Mexico_City',
 *     total: 1234,
 *     max_count: 42,        // útil para normalizar opacity en frontend
 *     buckets: [
 *       { weekday: 0, hour: 0, count: 0 },   // weekday: 0=Lun ... 6=Dom
 *       ...
 *     ] (168 buckets, todos presentes incluso si count=0)
 *   }
 */
final class ActivityHeatmapController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $days = (int) $request->query('days', 30);
        if ($days < 1 || $days > 365) {
            $days = 30;
        }
        $tz = (string) $request->query('tz', 'America/Mexico_City');
        // Validación mínima de tz: si Postgres lo rechaza, falla la query.
        // Mejor lista blanca de prefijos comunes para evitar inyección.
        if (!preg_match('/^[A-Za-z]+\/[A-Za-z_]+$/', $tz) && $tz !== 'UTC') {
            $tz = 'America/Mexico_City';
        }

        $tenantId = TenantContext::currentId();
        $cutoff = "NOW() - INTERVAL '{$days} days'";

        // Una sola query con CTE — Postgres optimiza el UNION ALL bien.
        // Excluimos soft-deleted donde aplique.
        $sql = "
            WITH events AS (
                SELECT created_at AS ts
                FROM daily_reports
                WHERE tenant_id = :t1
                  AND created_at >= {$cutoff}
                  AND deleted_at IS NULL
                UNION ALL
                SELECT created_at AS ts
                FROM comments
                WHERE tenant_id = :t2
                  AND created_at >= {$cutoff}
                  AND deleted_at IS NULL
                UNION ALL
                SELECT completed_at AS ts
                FROM tasks
                WHERE tenant_id = :t3
                  AND completed_at IS NOT NULL
                  AND completed_at >= {$cutoff}
                  AND deleted_at IS NULL
                UNION ALL
                SELECT started_at AS ts
                FROM time_entries
                WHERE tenant_id = :t4
                  AND started_at >= {$cutoff}
            )
            SELECT
                ((EXTRACT(DOW FROM (ts AT TIME ZONE :tz1))::int + 6) % 7) AS weekday,
                EXTRACT(HOUR FROM (ts AT TIME ZONE :tz2))::int AS hour,
                COUNT(*)::int AS count
            FROM events
            GROUP BY weekday, hour
        ";

        $rows = DB::select($sql, [
            't1' => $tenantId, 't2' => $tenantId, 't3' => $tenantId, 't4' => $tenantId,
            'tz1' => $tz, 'tz2' => $tz,
        ]);

        // Construir matriz 7×24 con ceros donde no hay datos
        $buckets = [];
        $byKey = [];
        foreach ($rows as $r) {
            $byKey["{$r->weekday}-{$r->hour}"] = (int) $r->count;
        }
        $maxCount = 0;
        $total = 0;
        for ($d = 0; $d < 7; $d++) {
            for ($h = 0; $h < 24; $h++) {
                $count = $byKey["{$d}-{$h}"] ?? 0;
                $buckets[] = [
                    'weekday' => $d,
                    'hour' => $h,
                    'count' => $count,
                ];
                if ($count > $maxCount) $maxCount = $count;
                $total += $count;
            }
        }

        return response()->json([
            'days' => $days,
            'timezone' => $tz,
            'total' => $total,
            'max_count' => $maxCount,
            'buckets' => $buckets,
        ]);
    }
}
