<?php

declare(strict_types=1);

namespace App\Modules\Onboarding\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Onboarding\Application\Services\OnboardingTemplateService;
use App\Modules\Onboarding\Domain\OnboardingTemplateItem;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CRUD del template de onboarding por tenant.
 *
 * Acceso: solo tenant_admin y hr (gated en Frontend con `manage_onboarding_template`
 * y enforced en este controller con check de role).
 */
class OnboardingTemplateController extends Controller
{
    /**
     * GET /api/v1/onboarding/template
     *
     * Devuelve los items del tenant + flag `is_default` para indicar si está
     * usando el template seed (no personalizado).
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = TenantContext::currentId();

        $items = OnboardingTemplateItem::query()
            ->where('tenant_id', $tenantId)
            ->orderBy('group_order')
            ->orderBy('item_order')
            ->get();

        $isDefault = $items->isEmpty();

        // Si no hay filas, hidratar con el default para mostrar en UI
        if ($isDefault) {
            $items = collect();
            foreach (OnboardingTemplateService::defaultTemplate() as $gi => $group) {
                foreach ($group['items'] as $ii => $item) {
                    $items->push((object) [
                        'id' => null,
                        'group_name' => $group['group'],
                        'group_order' => $gi,
                        'item_order' => $ii,
                        'title' => $item['title'],
                        'responsible_role' => $item['role'],
                        'default_days' => $item['days'],
                        'enabled' => true,
                    ]);
                }
            }
        }

        return response()->json([
            'data' => $items->map(fn ($r) => [
                'id' => $r->id,
                'group_name' => $r->group_name,
                'group_order' => (int) $r->group_order,
                'item_order' => (int) $r->item_order,
                'title' => $r->title,
                'responsible_role' => $r->responsible_role,
                'default_days' => (int) $r->default_days,
                'enabled' => (bool) $r->enabled,
            ]),
            'meta' => [
                'is_default' => $isDefault,
                'count' => $items->count(),
            ],
        ]);
    }

    /**
     * POST /api/v1/onboarding/template
     */
    public function store(Request $request): JsonResponse
    {
        $this->ensureCanManage($request);

        $data = $request->validate([
            'group_name' => ['required', 'string', 'max:100'],
            'group_order' => ['nullable', 'integer', 'min:0', 'max:99'],
            'item_order' => ['nullable', 'integer', 'min:0', 'max:99'],
            'title' => ['required', 'string', 'max:300'],
            'responsible_role' => ['nullable', 'string', 'max:60'],
            'default_days' => ['nullable', 'integer', 'min:0', 'max:365'],
        ]);

        $tenantId = TenantContext::currentId();

        // Si el tenant aún no tiene template propio, hidratar con default primero.
        // Evita que al añadir 1 item, los 15 originales desaparezcan.
        $hasCustom = OnboardingTemplateItem::where('tenant_id', $tenantId)->exists();
        if (!$hasCustom) {
            $this->seedFromDefault($tenantId);
        }

        $item = OnboardingTemplateItem::create([
            'tenant_id' => $tenantId,
            'group_name' => $data['group_name'],
            'group_order' => $data['group_order'] ?? 99,
            'item_order' => $data['item_order'] ?? 99,
            'title' => $data['title'],
            'responsible_role' => $data['responsible_role'] ?? null,
            'default_days' => $data['default_days'] ?? 7,
            'enabled' => true,
        ]);

        return response()->json(['data' => $this->serialize($item)], 201);
    }

    /**
     * PATCH /api/v1/onboarding/template/{item}
     */
    public function update(Request $request, OnboardingTemplateItem $item): JsonResponse
    {
        $this->ensureCanManage($request);

        $data = $request->validate([
            'group_name' => ['sometimes', 'string', 'max:100'],
            'group_order' => ['sometimes', 'integer', 'min:0', 'max:99'],
            'item_order' => ['sometimes', 'integer', 'min:0', 'max:99'],
            'title' => ['sometimes', 'string', 'max:300'],
            'responsible_role' => ['sometimes', 'nullable', 'string', 'max:60'],
            'default_days' => ['sometimes', 'integer', 'min:0', 'max:365'],
            'enabled' => ['sometimes', 'boolean'],
        ]);

        $item->fill($data);
        $item->save();

        return response()->json(['data' => $this->serialize($item)]);
    }

    /**
     * DELETE /api/v1/onboarding/template/{item}
     */
    public function destroy(Request $request, OnboardingTemplateItem $item): JsonResponse
    {
        $this->ensureCanManage($request);

        // Si es la última, también seed los del default antes de eliminar para que
        // el tenant no se quede con template vacío sin querer (flujo: seed + delete)
        $tenantId = TenantContext::currentId();
        $remainingAfter = OnboardingTemplateItem::where('tenant_id', $tenantId)
            ->where('id', '!=', $item->id)
            ->count();

        $item->delete();

        return response()->json([
            'ok' => true,
            'remaining' => $remainingAfter,
        ]);
    }

    /**
     * POST /api/v1/onboarding/template/reset
     *
     * Borra el template custom y vuelve al default.
     */
    public function reset(Request $request): JsonResponse
    {
        $this->ensureCanManage($request);

        $tenantId = TenantContext::currentId();
        $deleted = OnboardingTemplateItem::where('tenant_id', $tenantId)->delete();

        return response()->json([
            'ok' => true,
            'deleted' => $deleted,
            'message' => 'Template restablecido al default del sistema.',
        ]);
    }

    private function ensureCanManage(Request $request): void
    {
        $role = $request->user()->primaryRole()?->value;
        if (!in_array($role, ['tenant_admin', 'hr'], true)) {
            abort(403, 'Solo admin o RRHH pueden gestionar el template de onboarding.');
        }
    }

    private function seedFromDefault(string $tenantId): void
    {
        foreach (OnboardingTemplateService::defaultTemplate() as $gi => $group) {
            foreach ($group['items'] as $ii => $item) {
                OnboardingTemplateItem::create([
                    'tenant_id' => $tenantId,
                    'group_name' => $group['group'],
                    'group_order' => $gi,
                    'item_order' => $ii,
                    'title' => $item['title'],
                    'responsible_role' => $item['role'] ?? null,
                    'default_days' => $item['days'] ?? 7,
                    'enabled' => true,
                ]);
            }
        }
    }

    private function serialize(OnboardingTemplateItem $item): array
    {
        return [
            'id' => $item->id,
            'group_name' => $item->group_name,
            'group_order' => $item->group_order,
            'item_order' => $item->item_order,
            'title' => $item->title,
            'responsible_role' => $item->responsible_role,
            'default_days' => $item->default_days,
            'enabled' => $item->enabled,
        ];
    }
}
