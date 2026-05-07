<?php

declare(strict_types=1);

namespace App\Modules\Onboarding\Application\Services;

use App\Modules\Onboarding\Domain\OnboardingItem;
use App\Modules\Onboarding\Domain\OnboardingTemplateItem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Template del checklist de onboarding por tenant.
 *
 * Fuente de verdad:
 *   1. Tabla `onboarding_template_items` (editable por admin/HR vía UI).
 *   2. Si el tenant no tiene filas en la tabla, fallback al `defaultTemplate()`
 *      (constante PHP). Esto permite tenants nuevos sin requerir seed.
 *
 * `provisionFor()` se invoca:
 *   - Al aceptar invitación (listener ProvisionNewMemberResources).
 *   - Desde seeders demo.
 *
 * Cambios en el template solo afectan a futuros interns; los existentes
 * conservan sus items.
 */
final class OnboardingTemplateService
{
    /**
     * Template default cuando un tenant aún no ha personalizado el suyo.
     *
     * @return list<array{group: string, items: list<array{title: string, role: string, days: int}>}>
     */
    public static function defaultTemplate(): array
    {
        return [
            [
                'group' => 'Ingreso y documentación',
                'items' => [
                    ['title' => 'Firmar contrato de prácticas', 'role' => 'RRHH', 'days' => 2],
                    ['title' => 'Subir identificación oficial y comprobante', 'role' => 'Practicante', 'days' => 3],
                    ['title' => 'Firmar NDA y reglamento interno', 'role' => 'RRHH', 'days' => 4],
                    ['title' => 'Completar formulario bancario', 'role' => 'Practicante', 'days' => 10],
                ],
            ],
            [
                'group' => 'Accesos y herramientas',
                'items' => [
                    ['title' => 'Crear cuenta corporativa (correo)', 'role' => 'TI', 'days' => 2],
                    ['title' => 'Asignar laptop o equipo', 'role' => 'TI', 'days' => 2],
                    ['title' => 'Configurar VPN y credenciales', 'role' => 'TI', 'days' => 5],
                    ['title' => 'Invitación a workspace (Slack / MS Teams)', 'role' => 'Líder', 'days' => 3],
                ],
            ],
            [
                'group' => 'Orientación e integración',
                'items' => [
                    ['title' => 'Introducción a la plataforma Senda (tour)', 'role' => 'RRHH', 'days' => 1],
                    ['title' => 'Reunión 1:1 con mentor/a asignado/a', 'role' => 'Mentor', 'days' => 3],
                    ['title' => 'Presentación con el equipo', 'role' => 'Líder', 'days' => 5],
                    ['title' => 'Definición de OKRs del primer mes', 'role' => 'Líder', 'days' => 7],
                ],
            ],
            [
                'group' => 'Capacitación base',
                'items' => [
                    ['title' => 'Completar curso de seguridad de datos', 'role' => 'Practicante', 'days' => 14],
                    ['title' => 'Revisar playbook del equipo', 'role' => 'Practicante', 'days' => 10],
                    ['title' => 'Completar quiz de bienvenida', 'role' => 'Practicante', 'days' => 14],
                ],
            ],
        ];
    }

    /**
     * @deprecated Usa `defaultTemplate()` o `templateForTenant($tenantId)`.
     */
    public static function template(): array
    {
        return self::defaultTemplate();
    }

    /**
     * Lee el template efectivo del tenant.
     *
     * Si el tenant tiene filas habilitadas en `onboarding_template_items`,
     * las usa. Si no, retorna `defaultTemplate()`.
     *
     * @return list<array{group: string, items: list<array{title: string, role: string|null, days: int}>}>
     */
    public function templateForTenant(string $tenantId): array
    {
        // Bypass del global scope BelongsToTenant porque puede llamarse fuera de TenantContext.
        $rows = OnboardingTemplateItem::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('enabled', true)
            ->orderBy('group_order')
            ->orderBy('item_order')
            ->get();

        if ($rows->isEmpty()) {
            return self::defaultTemplate();
        }

        $byGroup = [];
        foreach ($rows as $r) {
            $key = $r->group_order . '|' . $r->group_name;
            if (!isset($byGroup[$key])) {
                $byGroup[$key] = [
                    'group' => $r->group_name,
                    'order' => $r->group_order,
                    'items' => [],
                ];
            }
            $byGroup[$key]['items'][] = [
                'title' => $r->title,
                'role' => $r->responsible_role,
                'days' => (int) $r->default_days,
            ];
        }

        $groups = array_values($byGroup);
        usort($groups, fn ($a, $b) => $a['order'] <=> $b['order']);
        // Strip 'order' from result
        return array_map(fn ($g) => ['group' => $g['group'], 'items' => $g['items']], $groups);
    }

    /**
     * Provisiona el checklist completo para un intern nuevo, usando el template
     * del tenant (si lo personalizó) o el default.
     *
     * @return int  Número de items creados.
     */
    public function provisionFor(string $tenantId, string $internUserId, ?Carbon $startDate = null): int
    {
        $startDate ??= now();
        $created = 0;
        $template = $this->templateForTenant($tenantId);

        foreach ($template as $gi => $group) {
            foreach ($group['items'] as $ii => $item) {
                OnboardingItem::create([
                    'tenant_id' => $tenantId,
                    'intern_user_id' => $internUserId,
                    'group_name' => $group['group'],
                    'group_order' => $gi,
                    'item_order' => $ii,
                    'title' => $item['title'],
                    'responsible_role' => $item['role'] ?? null,
                    'responsible_name' => null,
                    'due_at' => $startDate->copy()->addDays((int) ($item['days'] ?? 7)),
                    'done' => false,
                ]);
                $created++;
            }
        }

        return $created;
    }
}
