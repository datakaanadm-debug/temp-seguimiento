<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Controllers;

use App\Modules\Tasks\Application\Commands\AddComment;
use App\Modules\Tasks\Application\Commands\AddCommentHandler;
use App\Modules\Tasks\Domain\Comment;
use App\Modules\Tasks\Domain\Task;
use App\Modules\Tasks\Http\Requests\AddCommentRequest;
use App\Modules\Tasks\Http\Resources\CommentResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

final class CommentController extends Controller
{
    public function __construct(
        private readonly AddCommentHandler $addHandler,
    ) {}

    public function index(Task $task, Request $request): JsonResponse
    {
        $this->authorize('view', $task);

        $comments = Comment::query()
            ->where('commentable_type', Task::class)
            ->where('commentable_id', $task->id)
            ->whereNull('deleted_at')
            ->with('author')
            ->orderBy('created_at')
            ->paginate(50);

        return response()->json([
            'data' => CommentResource::collection($comments),
            'meta' => [
                'total' => $comments->total(),
                'per_page' => $comments->perPage(),
                'current_page' => $comments->currentPage(),
                'last_page' => $comments->lastPage(),
            ],
        ]);
    }

    public function store(Task $task, AddCommentRequest $request): JsonResponse
    {
        $this->authorize('comment', $task);

        $comment = $this->addHandler->handle(new AddComment(
            taskId: $task->id,
            author: $request->user(),
            body: (string) $request->string('body'),
            parentCommentId: $request->filled('parent_comment_id') ? (string) $request->string('parent_comment_id') : null,
        ));

        return response()->json([
            'data' => CommentResource::make($comment->load('author'))->resolve(),
        ], 201);
    }

    public function update(Comment $comment, Request $request): JsonResponse
    {
        if ($comment->author_id !== $request->user()->id) {
            abort(403, 'Only the author can edit a comment.');
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'min:1', 'max:10000'],
        ]);

        $comment->body = $validated['body'];
        $comment->edited_at = now();
        $comment->save();

        return response()->json([
            'data' => CommentResource::make($comment->load('author'))->resolve(),
        ]);
    }

    public function destroy(Comment $comment, Request $request): JsonResponse
    {
        if ($comment->author_id !== $request->user()->id
            && $request->user()->primaryRole()?->value !== 'tenant_admin') {
            abort(403);
        }
        $comment->delete();
        return response()->json(['ok' => true]);
    }
}
