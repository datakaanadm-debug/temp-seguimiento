<?php

declare(strict_types=1);

namespace App\Modules\Okrs\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Okrs\Domain\KeyResult;
use App\Modules\Okrs\Domain\Objective;
use App\Modules\Okrs\Domain\OkrCheckIn;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ObjectiveController extends Controller
{
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

    public function destroy(string $id): JsonResponse
    {
        Objective::findOrFail($id)->delete();
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

        $kr->progress_percent = $data['new_progress'];
        if (isset($data['new_confidence'])) $kr->confidence = $data['new_confidence'];
        $kr->save();

        return response()->json([
            'data' => [
                'id' => $kr->id,
                'progress_percent' => $kr->progress_percent,
                'confidence' => $kr->confidence,
            ],
        ]);
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
