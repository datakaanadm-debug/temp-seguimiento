<?php

declare(strict_types=1);

namespace App\Modules\Onboarding\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Onboarding\Domain\OnboardingItem;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OnboardingController extends Controller
{
    /**
     * GET /api/v1/onboarding/checklist?intern_user_id=...
     * Si el request lo hace un intern sin param, usa su propio user.
     */
    public function checklist(Request $request): JsonResponse
    {
        $me = $request->user();
        $internId = $request->query('intern_user_id') ?: $me->id;

        $items = OnboardingItem::where('intern_user_id', $internId)
            ->orderBy('group_order')
            ->orderBy('item_order')
            ->get();

        // Agrupa por group_name manteniendo orden
        $groups = [];
        foreach ($items as $it) {
            $key = $it->group_name;
            if (!isset($groups[$key])) {
                $groups[$key] = [
                    'name' => $it->group_name,
                    'order' => $it->group_order,
                    'items' => [],
                ];
            }
            $groups[$key]['items'][] = [
                'id' => $it->id,
                'title' => $it->title,
                'responsible_role' => $it->responsible_role,
                'responsible_name' => $it->responsible_name,
                'due_at' => $it->due_at?->toIso8601String(),
                'done' => (bool) $it->done,
                'completed_at' => $it->completed_at?->toIso8601String(),
                'notes' => $it->notes,
                'order' => $it->item_order,
            ];
        }

        $groupsArr = array_values($groups);
        usort($groupsArr, fn ($a, $b) => $a['order'] <=> $b['order']);

        $total = $items->count();
        $done = $items->where('done', true)->count();

        return response()->json([
            'data' => [
                'intern_user_id' => $internId,
                'total' => $total,
                'done' => $done,
                'progress_percent' => $total > 0 ? (int) round(($done / $total) * 100) : 0,
                'groups' => $groupsArr,
            ],
        ]);
    }

    public function toggle(Request $request, string $itemId): JsonResponse
    {
        $item = OnboardingItem::findOrFail($itemId);
        $item->done = !$item->done;
        $item->completed_at = $item->done ? now() : null;
        $item->completed_by = $item->done ? $request->user()->id : null;
        $item->save();

        return response()->json(['data' => [
            'id' => $item->id,
            'done' => $item->done,
            'completed_at' => $item->completed_at?->toIso8601String(),
        ]]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'intern_user_id' => ['required', 'uuid'],
            'group_name' => ['required', 'string', 'max:100'],
            'group_order' => ['nullable', 'integer'],
            'item_order' => ['nullable', 'integer'],
            'title' => ['required', 'string', 'max:300'],
            'responsible_role' => ['nullable', 'string', 'max:60'],
            'responsible_name' => ['nullable', 'string', 'max:150'],
            'due_at' => ['nullable', 'date'],
        ]);

        $item = OnboardingItem::create([
            'tenant_id' => TenantContext::currentId(),
            ...$data,
            'group_order' => $data['group_order'] ?? 99,
            'item_order' => $data['item_order'] ?? 99,
        ]);

        return response()->json(['data' => $item], 201);
    }

    public function destroy(string $itemId): JsonResponse
    {
        OnboardingItem::findOrFail($itemId)->delete();
        return response()->json(['ok' => true]);
    }
}
