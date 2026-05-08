<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Shared\Tenancy\TenantContext;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Recalcula `intern_data.hours_completed` para TODOS los practicantes
 * de TODOS los tenants, sumando `daily_reports.hours_worked` en estado
 * submitted/reviewed.
 *
 * Útil:
 *   - Una sola vez tras introducir el listener `RecomputeInternHours`
 *     para limpiar el random del seeder demo.
 *   - Periódicamente como sanity check (cron semanal opcional) por si
 *     algún listener fallara silenciosamente.
 *
 * Idempotente: correr 100 veces da el mismo resultado.
 */
final class RecomputeInternHoursCommand extends Command
{
    protected $signature = 'app:recompute-intern-hours {--dry-run : Solo muestra qué cambiaría sin escribir}';
    protected $description = 'Recalcula hours_completed de los practicantes desde sus daily_reports submitted/reviewed.';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $tenants = DB::table('tenants')->select('id', 'slug')->get();

        $totalChecked = 0;
        $totalUpdated = 0;

        foreach ($tenants as $tenant) {
            TenantContext::setCurrentById($tenant->id);
            DB::statement("SELECT set_config('app.tenant_id', ?, false)", [$tenant->id]);

            $rows = DB::table('intern_data as i')
                ->join('profiles as p', 'p.id', '=', 'i.profile_id')
                ->where('p.tenant_id', $tenant->id)
                ->where('p.kind', 'intern')
                ->whereNull('p.deleted_at')
                ->select('i.id as intern_data_id', 'p.user_id', 'i.hours_completed as old_hours')
                ->get();

            $tenantUpdates = 0;
            foreach ($rows as $r) {
                $totalChecked++;

                $newHours = (int) round((float) DB::table('daily_reports')
                    ->where('user_id', $r->user_id)
                    ->where('tenant_id', $tenant->id)
                    ->whereIn('status', ['submitted', 'reviewed'])
                    ->whereNull('deleted_at')
                    ->sum('hours_worked'));

                if ((int) $r->old_hours === $newHours) continue;

                if ($dryRun) {
                    $this->line("  [{$tenant->slug}] user={$r->user_id}  {$r->old_hours} → {$newHours}");
                } else {
                    DB::table('intern_data')
                        ->where('id', $r->intern_data_id)
                        ->update([
                            'hours_completed' => $newHours,
                            'updated_at' => now(),
                        ]);
                }
                $tenantUpdates++;
            }

            $this->info("✓ {$tenant->slug}: {$rows->count()} interns, {$tenantUpdates} cambios");
            $totalUpdated += $tenantUpdates;
        }

        TenantContext::clear();
        $action = $dryRun ? 'simulados' : 'aplicados';
        $this->info("Total: {$totalChecked} interns chequeados, {$totalUpdated} {$action}.");
        return self::SUCCESS;
    }
}
