<?php

declare(strict_types=1);

namespace App\Modules\Automation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Automation\Domain\AutomationRule;
use App\Modules\Automation\Domain\AutomationRun;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AutomationController extends Controller
{
    // ── Templates del sistema (catálogo read-only) ──
    private const TEMPLATES = [
        [
            'key' => 'blocker_unresolved_24h',
            'title' => 'Alertar bloqueo sin respuesta en 24h',
            'description' => 'Si una tarea entra en "Bloqueada" y no se resuelve en 24h → notificar al líder y mentor.',
            'trigger_kind' => 'blocker.created',
            'trigger_config' => [],
            'condition_config' => ['unresolved_hours' => 24, 'business_hours_only' => true],
            'actions_config' => [
                ['type' => 'notify', 'targets' => ['team_lead', 'mentor'], 'channel' => 'slack'],
                ['type' => 'notify', 'targets' => ['team_lead', 'mentor'], 'channel' => 'email'],
            ],
        ],
        [
            'key' => 'ai_weekly_digest',
            'title' => 'Resumir bitácora semanal con IA',
            'description' => 'Cada viernes 16:00 → resumen automático de la semana enviado a RH.',
            'trigger_kind' => 'schedule.cron',
            'trigger_config' => ['cron' => '0 16 * * 5'],
            'condition_config' => [],
            'actions_config' => [
                ['type' => 'ai.summarize', 'subject' => 'daily_reports', 'range' => 'past_week'],
                ['type' => 'notify', 'targets' => ['hr'], 'channel' => 'email'],
            ],
        ],
        [
            'key' => 'overdue_escalate',
            'title' => 'Escalar tarea vencida +3 días',
            'description' => 'Si due_date + 3d y estado ≠ Done → reasignar a líder y marcar crítica.',
            'trigger_kind' => 'task.overdue',
            'trigger_config' => ['days_after_due' => 3],
            'condition_config' => ['state_not' => 'DONE'],
            'actions_config' => [
                ['type' => 'task.reassign', 'to_role' => 'team_lead'],
                ['type' => 'task.mark_priority', 'priority' => 'urgent'],
            ],
        ],
        [
            'key' => 'intern_welcome',
            'title' => 'Mensaje de bienvenida a practicantes',
            'description' => 'Cuando se añade un practicante → DM por Slack con checklist de ingreso.',
            'trigger_kind' => 'intern.added',
            'trigger_config' => [],
            'condition_config' => [],
            'actions_config' => [
                ['type' => 'notify', 'targets' => ['intern'], 'channel' => 'slack', 'template' => 'welcome_intern'],
            ],
        ],
        [
            'key' => 'one_on_one_feedback',
            'title' => 'Feedback post-sesión 1:1',
            'description' => '10 min después de cada 1:1 → pedir rating y nota al practicante.',
            'trigger_kind' => 'mentor_session.completed',
            'trigger_config' => ['delay_minutes' => 10],
            'condition_config' => [],
            'actions_config' => [
                ['type' => 'notify', 'targets' => ['intern'], 'channel' => 'in_app', 'template' => 'feedback_1on1'],
            ],
        ],
        [
            'key' => 'low_activity_detect',
            'title' => 'Detectar baja productividad',
            'description' => 'Si bitácora < 3 días/semana × 2 semanas → alerta a RH.',
            'trigger_kind' => 'schedule.cron',
            'trigger_config' => ['cron' => '0 9 * * 1'],
            'condition_config' => ['daily_reports_min_per_week' => 3, 'consecutive_weeks' => 2],
            'actions_config' => [
                ['type' => 'notify', 'targets' => ['hr'], 'channel' => 'email', 'template' => 'low_activity'],
            ],
        ],
    ];

    /**
     * GET /api/v1/automation-rules
     */
    public function index(Request $request): JsonResponse
    {
        $q = AutomationRule::query()->orderBy('created_at');

        if ($request->filled('enabled')) {
            $q->where('enabled', $request->boolean('enabled'));
        }

        return response()->json([
            'data' => $q->get()->map(fn ($r) => $this->ruleToArray($r)),
            'meta' => [
                'total' => AutomationRule::count(),
                'active' => AutomationRule::where('enabled', true)->count(),
                'runs_this_month' => (int) AutomationRule::sum('runs_count'),
            ],
        ]);
    }

    /**
     * POST /api/v1/automation-rules
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:1000'],
            'trigger_kind' => ['required', 'string', 'max:60'],
            'trigger_config' => ['nullable', 'array'],
            'condition_config' => ['nullable', 'array'],
            'actions_config' => ['nullable', 'array'],
            'enabled' => ['nullable', 'boolean'],
            'template_key' => ['nullable', 'string'],
        ]);

        // Si viene template_key, pre-completamos con el template
        if (!empty($data['template_key'])) {
            $tpl = collect(self::TEMPLATES)->firstWhere('key', $data['template_key']);
            if ($tpl) {
                $data = array_merge($tpl, array_filter($data, fn ($v) => $v !== null && $v !== ''));
                unset($data['key'], $data['template_key']);
            }
        }

        $rule = AutomationRule::create([
            'tenant_id' => TenantContext::currentId(),
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'trigger_kind' => $data['trigger_kind'],
            'trigger_config' => $data['trigger_config'] ?? [],
            'condition_config' => $data['condition_config'] ?? [],
            'actions_config' => $data['actions_config'] ?? [],
            'enabled' => $data['enabled'] ?? true,
            'runs_count' => 0,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $this->ruleToArray($rule)], 201);
    }

    /**
     * PATCH /api/v1/automation-rules/{id}/toggle
     */
    public function toggle(string $id): JsonResponse
    {
        $rule = AutomationRule::findOrFail($id);
        $rule->enabled = !$rule->enabled;
        $rule->save();

        return response()->json(['data' => $this->ruleToArray($rule)]);
    }

    /**
     * PUT /api/v1/automation-rules/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $rule = AutomationRule::findOrFail($id);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:200'],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'trigger_kind' => ['sometimes', 'string', 'max:60'],
            'trigger_config' => ['sometimes', 'array'],
            'condition_config' => ['sometimes', 'array'],
            'actions_config' => ['sometimes', 'array'],
            'enabled' => ['sometimes', 'boolean'],
        ]);

        $rule->fill($data);
        $rule->save();

        return response()->json(['data' => $this->ruleToArray($rule)]);
    }

    /**
     * DELETE /api/v1/automation-rules/{id}
     */
    public function destroy(string $id): JsonResponse
    {
        AutomationRule::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    /**
     * GET /api/v1/automation-templates
     */
    public function templates(): JsonResponse
    {
        return response()->json(['data' => self::TEMPLATES]);
    }

    /**
     * GET /api/v1/automation-rules/{id}/runs
     */
    public function runs(string $id): JsonResponse
    {
        $rule = AutomationRule::findOrFail($id);
        $runs = AutomationRun::where('rule_id', $rule->id)
            ->orderByDesc('ran_at')
            ->limit(50)
            ->get();

        return response()->json([
            'data' => $runs->map(fn ($r) => [
                'id' => $r->id,
                'status' => $r->status,
                'ran_at' => $r->ran_at->toIso8601String(),
                'note' => $r->note,
            ]),
        ]);
    }

    private function ruleToArray(AutomationRule $r): array
    {
        return [
            'id' => $r->id,
            'title' => $r->title,
            'description' => $r->description,
            'trigger_kind' => $r->trigger_kind,
            'trigger_config' => $r->trigger_config,
            'condition_config' => $r->condition_config,
            'actions_config' => $r->actions_config,
            'enabled' => (bool) $r->enabled,
            'runs_count' => (int) $r->runs_count,
            'last_run_at' => $r->last_run_at?->toIso8601String(),
            'created_at' => $r->created_at->toIso8601String(),
        ];
    }
}
