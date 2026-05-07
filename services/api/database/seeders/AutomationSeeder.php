<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Automation\Domain\AutomationRule;
use App\Modules\Automation\Domain\AutomationRun;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AutomationSeeder extends Seeder
{
    public function run(): void
    {
        // 6 reglas espejo del mock original del front + 1 deshabilitada.
        $seed = [
            [
                'title' => 'Alertar bloqueo sin respuesta en 24h',
                'description' => 'Si una tarea entra en "Bloqueada" y no se resuelve en 24h → notificar al líder y mentor.',
                'trigger_kind' => 'blocker.created',
                'trigger_config' => [],
                'condition_config' => ['unresolved_hours' => 24, 'business_hours_only' => true],
                'actions_config' => [
                    ['type' => 'notify', 'targets' => ['team_lead', 'mentor'], 'channel' => 'slack'],
                ],
                'enabled' => true,
                'runs_count' => 42,
                'last_run_at_hours_ago' => 2,
            ],
            [
                'title' => 'Resumir bitácora semanal con IA',
                'description' => 'Cada viernes 16:00 → resumen automático de la semana enviado a RH.',
                'trigger_kind' => 'schedule.cron',
                'trigger_config' => ['cron' => '0 16 * * 5'],
                'condition_config' => [],
                'actions_config' => [
                    ['type' => 'ai.summarize', 'subject' => 'daily_reports', 'range' => 'past_week'],
                    ['type' => 'notify', 'targets' => ['hr'], 'channel' => 'email'],
                ],
                'enabled' => true,
                'runs_count' => 18,
                'last_run_at_hours_ago' => 24 * 7,
            ],
            [
                'title' => 'Escalar tarea vencida +3 días',
                'description' => 'Si due_date + 3d y estado ≠ Done → reasignar a líder y marcar crítica.',
                'trigger_kind' => 'task.overdue',
                'trigger_config' => ['days_after_due' => 3],
                'condition_config' => ['state_not' => 'DONE'],
                'actions_config' => [
                    ['type' => 'task.reassign', 'to_role' => 'team_lead'],
                    ['type' => 'task.mark_priority', 'priority' => 'urgent'],
                ],
                'enabled' => true,
                'runs_count' => 9,
                'last_run_at_hours_ago' => 24 * 5,
            ],
            [
                'title' => 'Mensaje de bienvenida a practicantes',
                'description' => 'Cuando se añade un practicante → DM por Slack con checklist de ingreso.',
                'trigger_kind' => 'intern.added',
                'trigger_config' => [],
                'condition_config' => [],
                'actions_config' => [
                    ['type' => 'notify', 'targets' => ['intern'], 'channel' => 'slack', 'template' => 'welcome_intern'],
                ],
                'enabled' => false,
                'runs_count' => 0,
                'last_run_at_hours_ago' => null,
            ],
            [
                'title' => 'Feedback post-sesión 1:1',
                'description' => '10 min después de cada 1:1 → pedir rating y nota al practicante.',
                'trigger_kind' => 'mentor_session.completed',
                'trigger_config' => ['delay_minutes' => 10],
                'condition_config' => [],
                'actions_config' => [
                    ['type' => 'notify', 'targets' => ['intern'], 'channel' => 'in_app', 'template' => 'feedback_1on1'],
                ],
                'enabled' => true,
                'runs_count' => 24,
                'last_run_at_hours_ago' => 24,
            ],
            [
                'title' => 'Detectar baja productividad',
                'description' => 'Si bitácora < 3 días/semana × 2 semanas → alerta a RH.',
                'trigger_kind' => 'schedule.cron',
                'trigger_config' => ['cron' => '0 9 * * 1'],
                'condition_config' => ['daily_reports_min_per_week' => 3, 'consecutive_weeks' => 2],
                'actions_config' => [
                    ['type' => 'notify', 'targets' => ['hr'], 'channel' => 'email', 'template' => 'low_activity'],
                ],
                'enabled' => true,
                'runs_count' => 7,
                'last_run_at_hours_ago' => 24 * 3,
            ],
        ];

        $tenants = DB::table('tenants')->get();
        $total = 0;

        foreach ($tenants as $tenant) {
            DB::statement("SELECT set_config('app.tenant_id', ?, false)", [$tenant->id]);

            $admin = DB::table('memberships')
                ->where('tenant_id', $tenant->id)
                ->where('role', 'tenant_admin')
                ->value('user_id');

            foreach ($seed as $s) {
                $rule = AutomationRule::create([
                    'tenant_id' => $tenant->id,
                    'title' => $s['title'],
                    'description' => $s['description'],
                    'trigger_kind' => $s['trigger_kind'],
                    'trigger_config' => $s['trigger_config'],
                    'condition_config' => $s['condition_config'],
                    'actions_config' => $s['actions_config'],
                    'enabled' => $s['enabled'],
                    'runs_count' => $s['runs_count'],
                    'last_run_at' => $s['last_run_at_hours_ago'] !== null
                        ? Carbon::now()->subHours($s['last_run_at_hours_ago'])
                        : null,
                    'created_by' => $admin,
                ]);

                // Siembra unas cuantas runs para los que tienen runs_count > 0
                for ($i = 0; $i < min($s['runs_count'], 5); $i++) {
                    AutomationRun::create([
                        'tenant_id' => $tenant->id,
                        'rule_id' => $rule->id,
                        'status' => $i === 0 ? 'success' : (random_int(1, 10) > 8 ? 'failure' : 'success'),
                        'payload' => [],
                        'note' => null,
                        'ran_at' => Carbon::now()->subHours(random_int(1, 24 * 7)),
                    ]);
                }

                $total++;
            }

            $this->command?->info("✓ Automation rules seeded for tenant {$tenant->slug}");
        }

        $this->command?->info("✓ Total automation rules created: {$total}");
    }
}
