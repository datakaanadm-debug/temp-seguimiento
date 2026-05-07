<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Modules\Gamification\Application\GamificationService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Job diario: por cada tenant y cada usuario "activo" (con al menos 1
 * daily_report en los últimos 30 días), si NO levantó ningún blocker en
 * esos mismos 30 días → otorga `zero-blocks` (gold, +100 pts).
 *
 * Idempotente: GamificationService::awardBadge no duplica.
 *
 * Por qué condicionamos a "activo": evita otorgarle la badge a usuarios
 * dormidos que técnicamente "no tienen blockers" porque no hicieron nada.
 *
 * Schedule: diario a las 03:00 (ver routes/console.php).
 */
final class AwardZeroBlocksBadges extends Command
{
    protected $signature = 'gamify:award-zero-blocks {--days=30}';
    protected $description = 'Otorga la badge zero-blocks a usuarios activos sin bloqueos en los últimos N días.';

    public function handle(GamificationService $g): int
    {
        $days = (int) $this->option('days');
        if ($days < 1) $days = 30;
        $cutoff = now()->subDays($days);

        $awarded = 0;
        $tenants = DB::table('tenants')->select('id', 'slug')->get();

        foreach ($tenants as $tenant) {
            TenantContext::setCurrentById($tenant->id);
            DB::statement("SELECT set_config('app.tenant_id', ?, false)", [$tenant->id]);

            // Usuarios activos: con al menos 1 daily_report en los últimos $days
            $activeUserIds = DB::table('daily_reports')
                ->where('tenant_id', $tenant->id)
                ->where('report_date', '>=', $cutoff->toDateString())
                ->whereNull('deleted_at')
                ->distinct()
                ->pluck('user_id');

            if ($activeUserIds->isEmpty()) {
                continue;
            }

            // Quienes SÍ levantaron blockers en los últimos $days
            $usersWithBlockers = DB::table('blockers')
                ->where('tenant_id', $tenant->id)
                ->where('created_at', '>=', $cutoff)
                ->whereNull('deleted_at')
                ->distinct()
                ->pluck('raised_by');

            $eligibleIds = $activeUserIds->diff($usersWithBlockers);

            foreach ($eligibleIds as $userId) {
                if ($g->awardBadge((string) $userId, 'zero-blocks')) {
                    $awarded++;
                }
            }

            $this->info(
                "tenant={$tenant->slug}: activos={$activeUserIds->count()} sin_blockers={$eligibleIds->count()}",
            );
        }

        TenantContext::clear();
        $this->info("Total nuevas zero-blocks otorgadas: {$awarded}");
        return self::SUCCESS;
    }
}
