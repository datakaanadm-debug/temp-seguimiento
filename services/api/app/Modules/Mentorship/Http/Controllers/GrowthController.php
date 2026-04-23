<?php

declare(strict_types=1);

namespace App\Modules\Mentorship\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Mentorship\Domain\GrowthGoal;
use App\Modules\Mentorship\Domain\GrowthSkill;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GrowthController extends Controller
{
    public function path(Request $request, string $internUserId): JsonResponse
    {
        $skills = GrowthSkill::where('intern_user_id', $internUserId)
            ->orderBy('skill')
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'skill' => $s->skill,
                'progress_percent' => (int) $s->progress_percent,
                'category' => $s->category,
            ]);

        $goals = GrowthGoal::where('intern_user_id', $internUserId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($g) => [
                'id' => $g->id,
                'text' => $g->text,
                'quarter' => $g->quarter,
                'done' => (bool) $g->done,
                'due_at' => $g->due_at?->toIso8601String(),
                'completed_at' => $g->completed_at?->toIso8601String(),
            ]);

        return response()->json([
            'data' => [
                'skills' => $skills,
                'goals' => $goals,
            ],
        ]);
    }

    public function upsertSkill(Request $request, string $internUserId): JsonResponse
    {
        $data = $request->validate([
            'skill' => ['required', 'string', 'max:120'],
            'progress_percent' => ['required', 'integer', 'min:0', 'max:100'],
            'category' => ['nullable', 'string', 'max:60'],
        ]);

        $skill = GrowthSkill::updateOrCreate(
            [
                'tenant_id' => TenantContext::currentId(),
                'intern_user_id' => $internUserId,
                'skill' => $data['skill'],
            ],
            [
                'progress_percent' => $data['progress_percent'],
                'category' => $data['category'] ?? null,
            ],
        );

        return response()->json(['data' => $skill]);
    }

    public function storeGoal(Request $request, string $internUserId): JsonResponse
    {
        $data = $request->validate([
            'text' => ['required', 'string', 'max:400'],
            'quarter' => ['nullable', 'string', 'max:10'],
            'due_at' => ['nullable', 'date'],
        ]);

        $goal = GrowthGoal::create([
            'tenant_id' => TenantContext::currentId(),
            'intern_user_id' => $internUserId,
            'text' => $data['text'],
            'quarter' => $data['quarter'] ?? null,
            'due_at' => $data['due_at'] ?? null,
        ]);

        return response()->json(['data' => $goal], 201);
    }

    public function toggleGoal(string $goalId): JsonResponse
    {
        $goal = GrowthGoal::findOrFail($goalId);
        $goal->done = !$goal->done;
        $goal->completed_at = $goal->done ? now() : null;
        $goal->save();

        return response()->json(['data' => $goal]);
    }

    public function destroyGoal(string $goalId): JsonResponse
    {
        $goal = GrowthGoal::findOrFail($goalId);
        $goal->delete();
        return response()->json(['ok' => true]);
    }
}
