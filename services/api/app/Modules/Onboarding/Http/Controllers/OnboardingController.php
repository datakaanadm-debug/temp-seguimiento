<?php

declare(strict_types=1);

namespace App\Modules\Onboarding\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Onboarding\Domain\Events\OnboardingChecklistCompleted;
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

        // Contexto del practicante: start_date/end_date para cohorte/día, mentor asignado
        $internCtx = \DB::table('profiles as p')
            ->where('p.user_id', $internId)
            ->select('p.start_date as start_date', 'p.end_date as end_date', 'p.created_at as created_at')
            ->first();

        $startDate = $internCtx?->start_date
            ? \Carbon\Carbon::parse($internCtx->start_date)
            : ($internCtx?->created_at ? \Carbon\Carbon::parse($internCtx->created_at) : null);
        $endDate = $internCtx?->end_date
            ? \Carbon\Carbon::parse($internCtx->end_date)
            : null;

        // total_days: usa el delta start→end del practicante si está definido;
        // si no, fallback al setting del tenant (`onboarding_program_days`); si no, 90.
        if ($startDate && $endDate && $endDate->greaterThan($startDate)) {
            $totalDays = (int) abs($startDate->copy()->startOfDay()->diffInDays($endDate->startOfDay(), false)) + 1;
        } else {
            $tenantSettings = \DB::table('tenants')
                ->where('id', TenantContext::currentId())
                ->value('settings');
            $settings = is_string($tenantSettings)
                ? (json_decode($tenantSettings, true) ?: [])
                : ((array) $tenantSettings ?: []);
            $totalDays = (int) ($settings['onboarding_program_days'] ?? 90);
            if ($totalDays < 1) {
                $totalDays = 90;
            }
        }

        $cohort = $startDate?->locale('es')->isoFormat('MMMM YYYY');
        $dayNumber = $startDate
            ? max(1, min($totalDays, (int) abs($startDate->copy()->startOfDay()->diffInDays(now()->startOfDay(), false)) + 1))
            : null;

        $mentorRow = \DB::table('mentor_assignments as ma')
            ->join('users as u', 'u.id', '=', 'ma.mentor_user_id')
            ->where('ma.intern_user_id', $internId)
            ->where('ma.status', 'active')
            ->orderByDesc('ma.started_at')
            ->select('u.id', 'u.name')
            ->first();
        $mentor = $mentorRow ? [
            'id' => $mentorRow->id,
            'name' => $mentorRow->name,
            'first_name' => $mentorRow->name ? explode(' ', $mentorRow->name)[0] : null,
        ] : null;

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
                'cohort' => $cohort,
                'day_number' => $dayNumber,
                'total_days' => $totalDays,
                'mentor' => $mentor,
                'start_date' => $startDate?->toDateString(),
                'end_date' => $endDate?->toDateString(),
            ],
        ]);
    }

    public function toggle(Request $request, string $itemId): JsonResponse
    {
        $item = OnboardingItem::findOrFail($itemId);
        $wasDone = (bool) $item->done;
        $item->done = !$wasDone;
        $item->completed_at = $item->done ? now() : null;
        $item->completed_by = $item->done ? $request->user()->id : null;
        $item->save();

        // Si recién pasamos a "done" y con esto el checklist completo del intern
        // queda al 100%, disparamos el evento (que el listener de gamificación
        // recoge para otorgar `first-day`).
        if (!$wasDone && $item->done) {
            $internId = $item->intern_user_id;
            $total = OnboardingItem::where('intern_user_id', $internId)->count();
            $done = OnboardingItem::where('intern_user_id', $internId)->where('done', true)->count();
            if ($total > 0 && $done === $total) {
                event(new OnboardingChecklistCompleted($internId, $total));
            }
        }

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
