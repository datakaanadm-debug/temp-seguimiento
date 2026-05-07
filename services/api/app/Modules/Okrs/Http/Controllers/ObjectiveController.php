<?php

declare(strict_types=1);

namespace App\Modules\Okrs\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Gamification\Application\GamificationService;
use App\Modules\Okrs\Domain\KeyResult;
use App\Modules\Okrs\Domain\Objective;
use App\Modules\Okrs\Domain\OkrCheckIn;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ObjectiveController extends Controller
{
    public function __construct(private readonly GamificationService $gamification) {}

    public function index(Request $request): JsonResponse
    {
        $q = Objective::query()->with('keyResults');
        if ($request->filled('level')) $q->where('level', $request->string('level'));
        if ($request->filled('quarter')) $q->where('quarter', $request->string('quarter'));
        if ($request->filled('owner_id')) $q->where('owner_id', $request->string('owner_id'));
        if ($request->filled('owner_type')) $q->where('owner_type', $request->string('owner_type'));
        if ($request->boolean('mine')) {
            $q->where('owner_type', 'user')->where('owner_id', $request->user()->id);
        }

        // Visibilidad por rol:
        //   - admin/hr: ven todo
        //   - team_lead/mentor/supervisor: ven company + team + individuals (alineación)
        //   - intern: ve company + team + sus propios individuales (no de otros interns)
        $actor = $request->user();
        $role = $actor->primaryRole()?->value;
        if ($role === 'intern') {
            $q->where(function ($sub) use ($actor) {
                $sub->whereIn('level', ['company', 'team'])
                    ->orWhere(function ($s) use ($actor) {
                        $s->where('level', 'individual')
                          ->where('owner_type', 'user')
                          ->where('owner_id', $actor->id);
                    });
            });
        }

        $objectives = $q->orderByRaw("CASE level WHEN 'company' THEN 1 WHEN 'team' THEN 2 ELSE 3 END")
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'data' => $objectives->map(fn ($o) => $this->objectiveToArray($o))->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'level' => ['required', 'in:company,team,individual'],
            'label' => ['required', 'string', 'max:400'],
            'quarter' => ['required', 'string', 'max:10'],
            'owner_type' => ['required', 'in:tenant,team,user'],
            'owner_id' => ['required', 'uuid'],
            'owner_name' => ['nullable', 'string', 'max:200'],
            'parent_objective_id' => ['nullable', 'uuid', 'exists:objectives,id'],
            'key_results' => ['nullable', 'array'],
            'key_results.*.text' => ['required', 'string', 'max:500'],
            'key_results.*.progress_percent' => ['nullable', 'integer', 'min:0', 'max:100'],
            'key_results.*.confidence' => ['nullable', 'integer', 'min:0', 'max:10'],
        ]);

        // Authorization por nivel:
        //   - company → solo tenant_admin + hr
        //   - team    → tenant_admin + hr + team_lead
        //   - individual → cualquiera (pero el owner debe ser el propio user salvo staff)
        $actor = $request->user();
        $role = $actor->primaryRole()?->value;
        $level = (string) $data['level'];

        if ($level === 'company' && !in_array($role, ['tenant_admin', 'hr'], true)) {
            abort(403, 'Solo admin o RRHH pueden crear OKRs a nivel empresa.');
        }
        if ($level === 'team' && !in_array($role, ['tenant_admin', 'hr', 'team_lead'], true)) {
            abort(403, 'Solo admin, RRHH o líder de equipo pueden crear OKRs a nivel equipo.');
        }
        if ($level === 'individual'
            && !in_array($role, ['tenant_admin', 'hr', 'team_lead'], true)
            && $data['owner_id'] !== $actor->id
        ) {
            abort(403, 'Solo puedes crear OKRs individuales para ti mismo.');
        }

        $krs = $data['key_results'] ?? [];
        unset($data['key_results']);

        $objective = Objective::create([
            'tenant_id' => TenantContext::currentId(),
            ...$data,
        ]);

        foreach ($krs as $i => $kr) {
            KeyResult::create([
                'tenant_id' => TenantContext::currentId(),
                'objective_id' => $objective->id,
                'position' => $i,
                'text' => $kr['text'],
                'progress_percent' => $kr['progress_percent'] ?? 0,
                'confidence' => $kr['confidence'] ?? 5,
            ]);
        }

        return response()->json([
            'data' => $this->objectiveToArray($objective->load('keyResults')),
        ], 201);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $objective = Objective::findOrFail($id);
        $actor = $request->user();
        $role = $actor->primaryRole()?->value;

        // Solo staff (admin/hr/team_lead) o el owner del objective pueden eliminar.
        $isStaff = in_array($role, ['tenant_admin', 'hr', 'team_lead'], true);
        $isOwner = $objective->owner_type === 'user' && $objective->owner_id === $actor->id;

        if (!$isStaff && !$isOwner) {
            abort(403, 'No tienes permiso para eliminar este OKR.');
        }

        $objective->delete();
        return response()->json(['ok' => true]);
    }

    public function checkIn(Request $request, string $krId): JsonResponse
    {
        $data = $request->validate([
            'new_progress' => ['required', 'integer', 'min:0', 'max:100'],
            'new_confidence' => ['nullable', 'integer', 'min:0', 'max:10'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $kr = KeyResult::findOrFail($krId);
        $objective = Objective::findOrFail($kr->objective_id);
        $actor = $request->user();
        $role = $actor->primaryRole()?->value;

        // Solo staff, o el owner del objective (si owner_type=user), pueden hacer check-in.
        $isStaff = in_array($role, ['tenant_admin', 'hr', 'team_lead'], true);
        $isOwner = $objective->owner_type === 'user' && $objective->owner_id === $actor->id;

        if (!$isStaff && !$isOwner) {
            abort(403, 'Solo el dueño del OKR o staff pueden registrar check-ins.');
        }

        OkrCheckIn::create([
            'tenant_id' => TenantContext::currentId(),
            'key_result_id' => $kr->id,
            'author_id' => $request->user()->id,
            'previous_progress' => $kr->progress_percent,
            'new_progress' => $data['new_progress'],
            'previous_confidence' => $kr->confidence,
            'new_confidence' => $data['new_confidence'] ?? $kr->confidence,
            'note' => $data['note'] ?? null,
        ]);

        $previousProgress = (int) $kr->progress_percent;
        $kr->progress_percent = $data['new_progress'];
        if (isset($data['new_confidence'])) $kr->confidence = $data['new_confidence'];
        $kr->save();

        // Si subió a 100, evaluamos completitud del objective y, si aplica,
        // del trimestre completo del owner para otorgar `okr-master`.
        if ($previousProgress < 100 && (int) $kr->progress_percent >= 100) {
            $this->onKeyResultCompleted($objective);
        }

        return response()->json([
            'data' => [
                'id' => $kr->id,
                'progress_percent' => $kr->progress_percent,
                'confidence' => $kr->confidence,
            ],
        ]);
    }

    /**
     * Evalúa si el objective quedó completo (todos sus KRs al 100%) y, si el
     * owner es un usuario individual, evalúa si todos sus objectives del
     * trimestre están completos para otorgar `okr-master`.
     */
    private function onKeyResultCompleted(Objective $objective): void
    {
        $allKrsDone = !KeyResult::where('objective_id', $objective->id)
            ->where('progress_percent', '<', 100)
            ->exists();

        if (!$allKrsDone) return;

        // Marcar el objective como completed (idempotente)
        if ($objective->status !== 'completed') {
            $objective->status = 'completed';
            $objective->save();
        }

        if ($objective->owner_type !== 'user' || !$objective->owner_id) {
            return;
        }

        // ¿Todos los objectives individuales de este usuario en este Q están completos?
        $userId = $objective->owner_id;
        $quarter = $objective->quarter;

        $totalQ = Objective::where('owner_type', 'user')
            ->where('owner_id', $userId)
            ->where('quarter', $quarter)
            ->count();

        if ($totalQ < 1) return;

        $doneQ = Objective::where('owner_type', 'user')
            ->where('owner_id', $userId)
            ->where('quarter', $quarter)
            ->where('status', 'completed')
            ->count();

        if ($doneQ === $totalQ) {
            $this->gamification->awardBadge($userId, 'okr-master');
        } else {
            // Progreso visible mientras avanza
            $this->gamification->updateProgress(
                $userId,
                'okr-master',
                (int) round(($doneQ / max(1, $totalQ)) * 100),
            );
        }
    }

    private function objectiveToArray(Objective $o): array
    {
        return [
            'id' => $o->id,
            'level' => $o->level,
            'label' => $o->label,
            'quarter' => $o->quarter,
            'owner_type' => $o->owner_type,
            'owner_id' => $o->owner_id,
            'owner_name' => $o->owner_name,
            'parent_objective_id' => $o->parent_objective_id,
            'status' => $o->status,
            'key_results' => $o->keyResults->map(fn ($k) => [
                'id' => $k->id,
                'position' => $k->position,
                'text' => $k->text,
                'progress_percent' => (int) $k->progress_percent,
                'confidence' => (int) $k->confidence,
                'unit' => $k->unit,
            ])->all(),
        ];
    }
}
