<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Onboarding\Domain\OnboardingItem;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OnboardingSeeder extends Seeder
{
    public function run(): void
    {
        $template = [
            [
                'group' => 'Ingreso y documentación',
                'items' => [
                    ['Firmar contrato de prácticas', 'RRHH', 2, true],
                    ['Subir identificación oficial y comprobante', 'Practicante', 3, true],
                    ['Firmar NDA y reglamento interno', 'RRHH', 4, true],
                    ['Completar formulario bancario', 'Practicante', 10, false],
                ],
            ],
            [
                'group' => 'Accesos y herramientas',
                'items' => [
                    ['Crear cuenta corporativa (correo)', 'TI', 2, true],
                    ['Asignar laptop o equipo', 'TI', 2, true],
                    ['Configurar VPN y credenciales', 'TI', 5, false],
                    ['Invitación a workspace (Slack / MS Teams)', 'Líder', 3, true],
                ],
            ],
            [
                'group' => 'Orientación e integración',
                'items' => [
                    ['Introducción a la plataforma Interna (tour)', 'RRHH', 1, true],
                    ['Reunión 1:1 con mentora asignada', 'Mentor', 3, true],
                    ['Presentación con el equipo', 'Líder', 5, true],
                    ['Definición de OKRs del primer mes', 'Líder', 7, false],
                ],
            ],
            [
                'group' => 'Capacitación base',
                'items' => [
                    ['Completar curso de seguridad de datos', 'Practicante', 14, true],
                    ['Revisar playbook del equipo', 'Practicante', 10, true],
                    ['Completar quiz de bienvenida', 'Practicante', 14, false],
                ],
            ],
        ];

        $tenants = DB::table('tenants')->get();

        foreach ($tenants as $tenant) {
            DB::statement("SELECT set_config('app.tenant_id', ?, false)", [$tenant->id]);

            $interns = DB::table('users as u')
                ->join('profiles as p', 'p.user_id', '=', 'u.id')
                ->where('p.tenant_id', $tenant->id)
                ->where('p.kind', 'intern')
                ->select('u.id', 'u.name')
                ->get();

            if ($interns->isEmpty()) {
                continue;
            }

            foreach ($interns as $internIdx => $intern) {
                foreach ($template as $gi => $grp) {
                    foreach ($grp['items'] as $ii => [$title, $role, $daysAfterStart, $defaultDone]) {
                        // Variamos done según intern para que no todos tengan idéntico estado
                        $done = $defaultDone && ($internIdx + $gi + $ii) % 4 !== 0;
                        OnboardingItem::create([
                            'tenant_id' => $tenant->id,
                            'intern_user_id' => $intern->id,
                            'group_name' => $grp['group'],
                            'group_order' => $gi,
                            'item_order' => $ii,
                            'title' => $title,
                            'responsible_role' => $role,
                            'responsible_name' => null,
                            'due_at' => now()->addDays($daysAfterStart - 12),
                            'done' => $done,
                            'completed_at' => $done ? now()->subDays(random_int(1, 12)) : null,
                        ]);
                    }
                }
            }

            $this->command?->info("✓ Onboarding checklist seeded for tenant {$tenant->slug} ({$interns->count()} interns)");
        }
    }
}
