<?php

declare(strict_types=1);

namespace App\Modules\Mentorship\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Mentorship\Domain\MentorNote;
use App\Modules\Mentorship\Http\Resources\MentorNoteResource;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MentorNoteController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $me = $request->user();
        $q = MentorNote::query()->with(['author'])->orderBy('created_at', 'desc');

        if ($request->filled('intern_user_id')) {
            $q->where('intern_user_id', $request->string('intern_user_id'));
        }
        if ($request->filled('session_id')) {
            $q->where('session_id', $request->string('session_id'));
        }

        // Regla: notas privadas sólo las ve su autor.
        $q->where(function ($sub) use ($me) {
            $sub->where('visibility', 'shared')
                ->orWhere(function ($w) use ($me) {
                    $w->where('visibility', 'private')->where('author_id', $me->id);
                });
        });

        return MentorNoteResource::collection(
            $q->paginate((int) $request->integer('per_page', 30)),
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'session_id' => ['nullable', 'uuid'],
            'intern_user_id' => ['required', 'uuid'],
            'visibility' => ['required', 'in:private,shared'],
            'body' => ['required', 'string', 'min:1', 'max:5000'],
            'tags' => ['nullable', 'array'],
        ]);

        $note = MentorNote::create([
            'tenant_id' => TenantContext::currentId(),
            'session_id' => $data['session_id'] ?? null,
            'intern_user_id' => $data['intern_user_id'],
            'author_id' => $request->user()->id,
            'visibility' => $data['visibility'],
            'body' => $data['body'],
            'tags' => $data['tags'] ?? [],
        ]);

        return response()->json([
            'data' => MentorNoteResource::make($note->load('author'))->resolve(),
        ], 201);
    }

    public function update(Request $request, string $id): MentorNoteResource
    {
        $note = MentorNote::findOrFail($id);
        if ($note->author_id !== $request->user()->id) {
            abort(403, 'Solo el autor puede editar sus notas.');
        }

        $data = $request->validate([
            'body' => ['required', 'string', 'min:1', 'max:5000'],
            'visibility' => ['nullable', 'in:private,shared'],
            'tags' => ['nullable', 'array'],
        ]);

        $note->fill(array_filter($data, fn ($v) => $v !== null));
        $note->save();

        return MentorNoteResource::make($note->load('author'));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $note = MentorNote::findOrFail($id);
        if ($note->author_id !== $request->user()->id) {
            abort(403);
        }
        $note->delete();
        return response()->json(['ok' => true]);
    }
}
