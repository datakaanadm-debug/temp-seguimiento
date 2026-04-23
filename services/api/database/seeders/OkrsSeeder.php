<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Okrs\Domain\KeyResult;
use App\Modules\Okrs\Domain\Objective;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OkrsSeeder extends Seeder
{
    public function run(): void
    {
        $tenants = DB::table('tenants')->get();
        $quarter = 'Q2 2026';

        foreach ($tenants as $tenant) {
            DB::statement("SELECT set_config('app.tenant_id', ?, false)", [$tenant->id]);

            // Company-level
            $company = Objective::create([
                'tenant_id' => $tenant->id,
                'level' => 'company',
                'label' => "Consolidar {$tenant->name} como el programa de prácticas #1 en su vertical",
                'quarter' => $quarter,
                'owner_type' => 'tenant',
                'owner_id' => $tenant->id,
                'owner_name' => $tenant->name,
                'status' => 'active',
            ]);
            foreach ([
                ['Alcanzar 30 empresas cliente activas', 42, 6],
                ['NPS del programa > 55 pts', 78, 9],
                ['85% retención trimestral de empresas', 60, 7],
            ] as $i => [$text, $progress, $conf]) {
                KeyResult::create([
                    'tenant_id' => $tenant->id,
                    'objective_id' => $company->id,
                    'position' => $i,
                    'text' => $text,
                    'progress_percent' => $progress,
                    'confidence' => $conf,
                ]);
            }

            // Team-level (un objetivo por cada team del tenant)
            $teams = DB::table('teams as t')
                ->where('t.tenant_id', $tenant->id)
                ->select('t.id', 't.name', 't.slug')
                ->get();

            $teamObjTemplates = [
                'Elevar consistencia visual del producto',
                'Reducir bloqueos y fricción operativa',
                'Documentar procesos críticos del equipo',
                'Mejorar satisfacción del cliente interno',
            ];
            foreach ($teams as $ti => $team) {
                $teamObj = Objective::create([
                    'tenant_id' => $tenant->id,
                    'level' => 'team',
                    'label' => $teamObjTemplates[$ti % count($teamObjTemplates)] . ' — ' . $team->name,
                    'quarter' => $quarter,
                    'owner_type' => 'team',
                    'owner_id' => $team->id,
                    'owner_name' => 'Equipo ' . $team->name,
                    'parent_objective_id' => $company->id,
                    'status' => 'active',
                ]);
                foreach ([
                    ['Auditar 100% de entregables de Q1', 55, 7],
                    ['Publicar 2 mejoras priorizadas', 30, 5],
                    ['Co-facilitar sesión con Producto', 66, 8],
                ] as $i => [$text, $progress, $conf]) {
                    KeyResult::create([
                        'tenant_id' => $tenant->id,
                        'objective_id' => $teamObj->id,
                        'position' => $i,
                        'text' => $text,
                        'progress_percent' => $progress - ($ti * 5),
                        'confidence' => $conf,
                    ]);
                }

                // Individual-level: un OKR per intern del team, hijo del team objective
                $teamInterns = DB::table('users as u')
                    ->join('profiles as p', 'p.user_id', '=', 'u.id')
                    ->join('team_memberships as tm', 'tm.user_id', '=', 'u.id')
                    ->where('p.tenant_id', $tenant->id)
                    ->where('p.kind', 'intern')
                    ->where('tm.team_id', $team->id)
                    ->select('u.id', 'u.name')
                    ->get();

                foreach ($teamInterns as $ii => $intern) {
                    $indiv = Objective::create([
                        'tenant_id' => $tenant->id,
                        'level' => 'individual',
                        'label' => "Contribuir a la meta de equipo — plan personal Q2",
                        'quarter' => $quarter,
                        'owner_type' => 'user',
                        'owner_id' => $intern->id,
                        'owner_name' => $intern->name,
                        'parent_objective_id' => $teamObj->id,
                        'status' => 'active',
                    ]);
                    foreach ([
                        ['Completar 1 entregable end-to-end', 90, 9],
                        ['Proponer 3 mejoras al proceso del equipo', 66, 7],
                        ['Mentorizar a otro practicante junior', 30, 5],
                    ] as $i => [$text, $progress, $conf]) {
                        KeyResult::create([
                            'tenant_id' => $tenant->id,
                            'objective_id' => $indiv->id,
                            'position' => $i,
                            'text' => $text,
                            'progress_percent' => max(10, $progress - ($ii * 10) + random_int(-15, 10)),
                            'confidence' => max(3, $conf - ($ii % 3)),
                        ]);
                    }
                }
            }

            $this->command?->info("✓ OKRs seeded for tenant {$tenant->slug}");
        }
    }
}
