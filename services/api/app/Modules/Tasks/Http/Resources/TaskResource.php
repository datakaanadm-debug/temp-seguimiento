<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Tasks\Domain\Task
 */
final class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'list_id' => $this->list_id,
            'key_result_id' => $this->key_result_id,
            'parent_task_id' => $this->parent_task_id,
            'title' => $this->title,
            'description' => $this->description,
            'state' => $this->state->value,
            'state_category' => $this->state->category(),
            'priority' => $this->priority->value,
            'priority_weight' => $this->priority->sortWeight(),
            'assignee' => $this->whenLoaded('assignee', fn () => [
                'id' => $this->assignee?->id,
                'name' => $this->assignee?->name,
                'email' => $this->assignee?->email,
                'avatar_url' => $this->assignee?->avatar_url,
            ]),
            'reviewer' => $this->whenLoaded('reviewer', fn () => [
                'id' => $this->reviewer?->id,
                'name' => $this->reviewer?->name,
            ]),
            'due_at' => $this->due_at?->toIso8601String(),
            'is_overdue' => $this->isOverdue(),
            'estimated_minutes' => $this->estimated_minutes,
            'actual_minutes' => $this->actual_minutes,
            'position' => $this->position,
            'blocked_reason' => $this->blocked_reason,
            'started_at' => $this->started_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'subtask_count' => $this->whenCounted('subtasks'),
            'comment_count' => $this->whenCounted('comments'),
            'attachment_count' => $this->whenCounted('attachments'),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            // Si el caller eager-loadeó `collaborators` se usa eso (cero queries
            // adicionales). Si no, fallback a la query manual — solo se debe
            // tocar este path en endpoints que no cargan la relación (ej. detalle).
            // Lista N+1 fix: en TaskController::index() ahora `with('collaborators')`.
            'collaborators' => $this->resolveCollaborators(),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }

    /**
     * Devuelve los colaboradores en formato plano. Si la relación está eager-
     * loadeada (via `with('collaborators')` en el controller), no hace queries
     * adicionales. Como fallback (controllers que no la cargan) ejecuta el join
     * — esto es para preservar compatibilidad mientras se migran todos los
     * call-sites a eager loading.
     *
     * @return array<int, array<string, mixed>>
     */
    private function resolveCollaborators(): array
    {
        if ($this->relationLoaded('collaborators')) {
            return $this->collaborators->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'avatar_url' => $u->avatar_url,
                'assigned_at' => $u->pivot->assigned_at,
            ])->all();
        }

        // Fallback (slow path) — log para detectar call-sites que falta migrar.
        $rows = \DB::table('task_assignees as ta')
            ->join('users as u', 'u.id', '=', 'ta.user_id')
            ->where('ta.task_id', $this->id)
            ->where('ta.role', 'assignee')
            ->select('u.id', 'u.name', 'u.email', 'u.avatar_url', 'ta.assigned_at')
            ->orderBy('ta.assigned_at')
            ->get();

        return $rows->map(fn ($r) => [
            'id' => $r->id,
            'name' => $r->name,
            'email' => $r->email,
            'avatar_url' => $r->avatar_url,
            'assigned_at' => $r->assigned_at,
        ])->all();
    }
}
