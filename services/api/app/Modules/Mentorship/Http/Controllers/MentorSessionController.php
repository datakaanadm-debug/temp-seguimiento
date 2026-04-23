<?php

declare(strict_types=1);

namespace App\Modules\Mentorship\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Mentorship\Domain\MentorSession;
use App\Modules\Mentorship\Http\Resources\MentorSessionResource;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;

class MentorSessionController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $query = MentorSession::query()
            ->with(['mentor', 'intern'])
            ->orderBy('scheduled_at', 'desc');

        if ($request->boolean('mine_as_mentor')) {
            $query->where('mentor_user_id', $user->id);
        }
        if ($request->boolean('mine_as_intern')) {
            $query->where('intern_user_id', $user->id);
        }
        if ($request->filled('intern_user_id')) {
            $query->where('intern_user_id', $request->string('intern_user_id'));
        }
        if ($request->filled('mentor_user_id')) {
            $query->where('mentor_user_id', $request->string('mentor_user_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->boolean('upcoming_only')) {
            $query->where('scheduled_at', '>=', now())->where('status', 'scheduled')
                ->orderBy('scheduled_at', 'asc');
        }

        return MentorSessionResource::collection(
            $query->paginate((int) $request->integer('per_page', 30)),
        );
    }

    public function show(string $id): MentorSessionResource
    {
        $session = MentorSession::with(['mentor', 'intern', 'notes.author'])->findOrFail($id);
        return MentorSessionResource::make($session);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'mentor_user_id' => ['required', 'uuid'],
            'intern_user_id' => ['required', 'uuid'],
            'scheduled_at' => ['required', 'date'],
            'duration_minutes' => ['nullable', 'integer', 'min:5', 'max:480'],
            'topic' => ['required', 'string', 'max:300'],
            'agenda' => ['nullable', 'array'],
            'agenda.*' => ['string', 'max:200'],
            'location' => ['nullable', 'string', 'max:200'],
            'tags' => ['nullable', 'array'],
        ]);

        $session = MentorSession::create([
            'tenant_id' => TenantContext::currentId(),
            'mentor_user_id' => $data['mentor_user_id'],
            'intern_user_id' => $data['intern_user_id'],
            'scheduled_at' => Carbon::parse($data['scheduled_at']),
            'duration_minutes' => $data['duration_minutes'] ?? 30,
            'topic' => $data['topic'],
            'agenda' => $data['agenda'] ?? [],
            'location' => $data['location'] ?? null,
            'tags' => $data['tags'] ?? [],
            'status' => 'scheduled',
        ]);

        return response()->json([
            'data' => MentorSessionResource::make($session->load(['mentor', 'intern']))->resolve(),
        ], 201);
    }

    public function update(Request $request, string $id): MentorSessionResource
    {
        $session = MentorSession::findOrFail($id);

        $data = $request->validate([
            'scheduled_at' => ['nullable', 'date'],
            'duration_minutes' => ['nullable', 'integer', 'min:5', 'max:480'],
            'topic' => ['nullable', 'string', 'max:300'],
            'agenda' => ['nullable', 'array'],
            'location' => ['nullable', 'string', 'max:200'],
            'status' => ['nullable', 'string', 'in:scheduled,in_progress,completed,cancelled,no_show'],
            'tags' => ['nullable', 'array'],
        ]);

        $session->fill(array_filter($data, fn ($v) => $v !== null));

        if (($data['status'] ?? null) === 'completed' && !$session->completed_at) {
            $session->completed_at = now();
        }
        if (($data['status'] ?? null) === 'in_progress' && !$session->started_at) {
            $session->started_at = now();
        }

        $session->save();

        return MentorSessionResource::make($session->load(['mentor', 'intern']));
    }

    public function destroy(string $id): JsonResponse
    {
        $session = MentorSession::findOrFail($id);
        $session->delete();

        return response()->json(['ok' => true]);
    }
}
