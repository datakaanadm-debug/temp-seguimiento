<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Application\Commands;

use App\Modules\Identity\Domain\User;
use App\Modules\Tasks\Domain\Comment;
use App\Modules\Tasks\Domain\Events\TaskCommented;
use App\Modules\Tasks\Domain\Task;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;

final class AddCommentHandler
{
    public function handle(AddComment $command): Comment
    {
        /** @var Task $task */
        $task = Task::query()->findOrFail($command->taskId);

        $mentions = $this->extractMentions($command->body);

        return DB::transaction(function () use ($task, $command, $mentions) {
            $comment = Comment::create([
                'commentable_type' => Task::class,
                'commentable_id' => $task->id,
                'author_id' => $command->author->id,
                'body' => $command->body,
                'mentions' => $mentions,
                'parent_comment_id' => $command->parentCommentId,
            ]);

            DB::afterCommit(function () use ($task, $comment, $command) {
                event(new TaskCommented($task, $comment, $command->author));
            });

            return $comment;
        });
    }

    /**
     * Extrae @user-id menciones. En MVP pedimos menciones como `@{uuid}`; fase 2 haremos
     * lookup por @username. Retorna lista de user_ids que pertenecen al tenant actual.
     *
     * @return list<string>
     */
    private function extractMentions(string $body): array
    {
        preg_match_all('/@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i', $body, $m);
        $candidates = array_unique($m[1] ?? []);

        if (empty($candidates)) {
            return [];
        }

        // Filtrar a solo users del tenant
        return User::query()
            ->whereIn('id', $candidates)
            ->whereHas('memberships', fn ($q) => $q
                ->where('tenant_id', TenantContext::currentId())
                ->where('status', 'active'))
            ->pluck('id')
            ->map(fn ($id) => (string) $id)
            ->all();
    }
}
