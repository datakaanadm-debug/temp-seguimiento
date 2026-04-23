<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Controllers;

use App\Modules\Tasks\Domain\Tag;
use App\Modules\Tasks\Http\Resources\TagResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Str;

final class TagController extends Controller
{
    public function index(): JsonResponse
    {
        $tags = Tag::query()->orderBy('name')->get();
        return response()->json([
            'data' => TagResource::collection($tags),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:1', 'max:60'],
            'color' => ['sometimes', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        $slug = Str::slug($validated['name']);
        $existing = Tag::query()->where('slug', $slug)->first();
        if ($existing) {
            return response()->json(['data' => TagResource::make($existing)->resolve()], 200);
        }

        $tag = Tag::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'color' => $validated['color'] ?? '#64748B',
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'data' => TagResource::make($tag)->resolve(),
        ], 201);
    }

    public function destroy(Tag $tag): JsonResponse
    {
        $tag->delete();
        return response()->json(['ok' => true]);
    }
}
