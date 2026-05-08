<?php

declare(strict_types=1);

namespace App\Modules\People\Application\Listeners;

use App\Modules\Tracking\Domain\Events\DailyReportSubmitted;
use Illuminate\Support\Facades\DB;

/**
 * Listener: cada vez que se envía una bitácora, recalcula
 * `intern_data.hours_completed` del autor sumando todas las
 * `daily_reports.hours_worked` en estado submitted/reviewed.
 *
 * Por qué recompute completo en lugar de incrementar:
 *   · Es defensivo: si algún reporte se reabre, edita o suaviza, el
 *     total siempre converge al estado real de la BD.
 *   · El query es barato (un sum sobre rows del mismo user).
 *   · Idempotente — disparar el evento dos veces no duplica horas.
 *
 * Solo aplica a usuarios con perfil `kind=intern` y registro
 * `intern_data` ya provisionado (lo crea ProvisionNewMemberResources
 * al activar la cuenta del practicante).
 */
final class RecomputeInternHours
{
    public function handle(DailyReportSubmitted $event): void
    {
        $userId = $event->report->user_id;
        if (!$userId) return;

        $tenantId = $event->report->tenant_id;
        if (!$tenantId) return;

        // Solo si el user es practicante y tiene intern_data
        $internDataId = DB::table('intern_data as i')
            ->join('profiles as p', 'p.id', '=', 'i.profile_id')
            ->where('p.user_id', $userId)
            ->where('p.tenant_id', $tenantId)
            ->where('p.kind', 'intern')
            ->whereNull('p.deleted_at')
            ->value('i.id');

        if (!$internDataId) return;

        $totalHours = (float) DB::table('daily_reports')
            ->where('user_id', $userId)
            ->where('tenant_id', $tenantId)
            ->whereIn('status', ['submitted', 'reviewed'])
            ->whereNull('deleted_at')
            ->sum('hours_worked');

        // hours_completed es integer; redondeamos al entero más cercano.
        DB::table('intern_data')
            ->where('id', $internDataId)
            ->update([
                'hours_completed' => (int) round($totalHours),
                'updated_at' => now(),
            ]);
    }
}
