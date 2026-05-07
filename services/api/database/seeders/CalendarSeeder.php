<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Calendar\Domain\CalendarEvent;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Siembra eventos de calendario para HOY (y unos pocos mañana)
 * para que /mi-dia y /calendar/today muestren data real al abrir.
 */
class CalendarSeeder extends Seeder
{
    public function run(): void
    {
        // Plantillas por kind de rol del user
        $templatesByRole = [
            'intern' => [
                ['title' => 'Bloque focus — avanzar tareas', 'hour' => 9, 'duration' => 90, 'kind' => 'focus', 'location' => 'Escritorio'],
                ['title' => 'Escribir bitácora diaria', 'hour' => 16, 'duration' => 20, 'kind' => 'other', 'location' => null],
            ],
            'mentor' => [
                ['title' => 'Standup del equipo', 'hour' => 9, 'duration' => 15, 'kind' => 'standup', 'location' => 'Meet'],
                ['title' => 'Revisión de PRs', 'hour' => 14, 'duration' => 60, 'kind' => 'focus', 'location' => null],
            ],
            'tenant_admin' => [
                ['title' => 'Sync liderazgo', 'hour' => 8, 'duration' => 30, 'kind' => 'sync', 'location' => 'Sala Atlas'],
            ],
            'hr' => [
                ['title' => 'Revisar nuevas solicitudes', 'hour' => 10, 'duration' => 45, 'kind' => 'focus', 'location' => null],
                ['title' => 'Entrevista candidato', 'hour' => 15, 'duration' => 45, 'kind' => 'meeting', 'location' => 'Sala Éter'],
            ],
            'team_lead' => [
                ['title' => 'Planning sprint', 'hour' => 11, 'duration' => 60, 'kind' => 'meeting', 'location' => 'Meet'],
            ],
        ];

        $tenants = DB::table('tenants')->get();
        $total = 0;

        foreach ($tenants as $tenant) {
            DB::statement("SELECT set_config('app.tenant_id', ?, false)", [$tenant->id]);

            $members = DB::table('memberships')
                ->where('tenant_id', $tenant->id)
                ->where('status', 'active')
                ->get();

            foreach ($members as $m) {
                $role = $m->role;
                $tpl = $templatesByRole[$role] ?? [];
                if (empty($tpl)) continue;

                foreach ($tpl as $e) {
                    $starts = Carbon::today('America/Mexico_City')->setTime($e['hour'], 0);
                    CalendarEvent::create([
                        'tenant_id' => $tenant->id,
                        'user_id' => $m->user_id,
                        'created_by' => $m->user_id,
                        'starts_at' => $starts,
                        'duration_minutes' => $e['duration'],
                        'title' => $e['title'],
                        'kind' => $e['kind'],
                        'location' => $e['location'],
                        'metadata' => [],
                    ]);
                    $total++;
                }
            }

            $this->command?->info("✓ Calendar events seeded for tenant {$tenant->slug}");
        }

        $this->command?->info("✓ Total calendar events created: {$total}");
    }
}
