<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Seedea plantillas de reporte por tenant. Sin esto, /reportes y
 * /reportes/universidad/solicitar muestran listas vacías y el practicante
 * o RRHH no puede generar reportes hasta que un admin las cree manualmente.
 *
 * Cada tenant recibe:
 *   1. "Reporte de Universidad" (kind=university) — el flujo principal,
 *      genera PDF con KPIs + tareas + bitácoras del practicante en el periodo.
 *   2. "Resumen Ejecutivo Trimestral" (kind=executive) — resumen del programa
 *      a nivel tenant para sponsors / dirección.
 *   3. "Reporte de Equipo" (kind=team) — equipo + miembros + cumplimiento.
 *
 * Marcadas como `is_system=true` para que la UI las distinga de plantillas
 * custom creadas por admin y no permita borrarlas.
 */
class ReportTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $tenants = DB::table('tenants')->select('id', 'slug', 'name')->get();
        if ($tenants->isEmpty()) {
            $this->command?->warn('No hay tenants — corre DemoSeeder primero.');
            return;
        }

        $defaults = [
            [
                'kind' => 'university',
                'name' => 'Reporte de Universidad',
                'layout' => 'university',
                'config' => [
                    'description' => 'Reporte oficial de avance del practicante para entregar a su universidad. Incluye horas cumplidas, tareas, bitácoras y evaluación.',
                    'parameters_schema' => [
                        'subject_user_id' => ['type' => 'uuid', 'required' => true, 'label' => 'Practicante'],
                        'period_start' => ['type' => 'date', 'required' => true, 'label' => 'Periodo desde'],
                        'period_end' => ['type' => 'date', 'required' => true, 'label' => 'Periodo hasta'],
                    ],
                    'sections' => ['summary', 'tasks', 'daily_reports', 'evaluation'],
                    'output_format' => 'pdf',
                ],
            ],
            [
                'kind' => 'executive',
                'name' => 'Resumen Ejecutivo Trimestral',
                'layout' => 'default',
                'config' => [
                    'description' => 'Snapshot trimestral del programa: practicantes activos, KPIs agregados, top performers y bloqueos sin resolver.',
                    'parameters_schema' => [
                        'quarter' => ['type' => 'string', 'required' => true, 'label' => 'Trimestre (Q1 2026, Q2 2026...)'],
                    ],
                    'sections' => ['kpis', 'top_performers', 'risks', 'evaluations_summary'],
                    'output_format' => 'pdf',
                ],
            ],
            [
                'kind' => 'team',
                'name' => 'Reporte de Equipo',
                'layout' => 'default',
                'config' => [
                    'description' => 'Cumplimiento del equipo en un periodo: miembros, tareas cerradas, OKRs avanzados, evaluaciones recientes.',
                    'parameters_schema' => [
                        'team_id' => ['type' => 'uuid', 'required' => true, 'label' => 'Equipo'],
                        'period_start' => ['type' => 'date', 'required' => true, 'label' => 'Periodo desde'],
                        'period_end' => ['type' => 'date', 'required' => true, 'label' => 'Periodo hasta'],
                    ],
                    'sections' => ['members', 'tasks', 'okrs'],
                    'output_format' => 'pdf',
                ],
            ],
        ];

        $created = 0;
        foreach ($tenants as $tenant) {
            DB::statement("SELECT set_config('app.tenant_id', ?, false)", [$tenant->id]);

            foreach ($defaults as $tpl) {
                // Idempotente: no duplica si ya existe (por nombre + kind + tenant)
                $exists = DB::table('report_templates')
                    ->where('tenant_id', $tenant->id)
                    ->where('kind', $tpl['kind'])
                    ->where('name', $tpl['name'])
                    ->whereNull('deleted_at')
                    ->exists();
                if ($exists) continue;

                DB::table('report_templates')->insert([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenant->id,
                    'kind' => $tpl['kind'],
                    'name' => $tpl['name'],
                    'layout' => $tpl['layout'],
                    'config' => json_encode($tpl['config']),
                    'is_system' => true,
                    'created_by' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $created++;
            }

            $this->command?->info("✓ ReportTemplates seedeados para {$tenant->slug}");
        }

        $this->command?->info("Total: {$created} plantillas nuevas (las existentes se conservan).");
    }
}
