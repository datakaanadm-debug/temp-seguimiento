<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Domain;

use App\Modules\Identity\Domain\User;
use App\Modules\Tasks\Domain\Enums\AssigneeRole;
use App\Modules\Tasks\Domain\Enums\TaskPriority;
use App\Modules\Tasks\Domain\Enums\TaskState;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $project_id
 * @property ?string $list_id
 * @property ?string $parent_task_id
 * @property string $title
 * @property ?string $description
 * @property TaskState $state
 * @property TaskPriority $priority
 * @property ?string $assignee_id
 * @property ?string $reviewer_id
 * @property ?\DateTimeInterface $due_at
 * @property ?int $estimated_minutes
 * @property int $actual_minutes
 * @property int $position
 * @property ?string $blocked_reason
 * @property ?\DateTimeInterface $started_at
 * @property ?\DateTimeInterface $completed_at
 * @property ?\DateTimeInterface $cancelled_at
 * @property array $metadata
 */
class Task extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'tasks';

    protected $fillable = [
        'tenant_id',
        'project_id',
        'list_id',
        'key_result_id',
        'parent_task_id',
        'title',
        'description',
        'state',
        'priority',
        'assignee_id',
        'reviewer_id',
        'due_at',
        'estimated_minutes',
        'actual_minutes',
        'position',
        'blocked_reason',
        'started_at',
        'completed_at',
        'cancelled_at',
        'metadata',
    ];

    protected $casts = [
        'state' => TaskState::class,
        'priority' => TaskPriority::class,
        'due_at' => 'datetime',
        'estimated_minutes' => 'integer',
        'actual_minutes' => 'integer',
        'position' => 'integer',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'metadata' => 'array',
    ];

    protected $attributes = [
        'state' => 'TO_DO',
        'priority' => 'normal',
        'actual_minutes' => 0,
        'position' => 0,
    ];

    // ── Relaciones ─────────────────────────────────────────────────────

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function list(): BelongsTo
    {
        return $this->belongsTo(TaskList::class, 'list_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'parent_task_id');
    }

    public function subtasks(): HasMany
    {
        return $this->hasMany(Task::class, 'parent_task_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    /**
     * Multi-asignación vía pivot. El `assignee_id` directo es el primary assignee;
     * reviewers y watchers viven en `task_assignees`.
     */
    public function assignees()
    {
        return $this->belongsToMany(User::class, 'task_assignees', 'task_id', 'user_id')
            ->withPivot(['role', 'assigned_at', 'assigned_by']);
    }

    /**
     * Co-asignados (no el responsable principal). Filtra el pivot a role='assignee'.
     * Permite `with('collaborators')` para evitar el N+1 que tenía el TaskResource
     * cuando armaba la lista manualmente con DB::table por cada Task.
     */
    public function collaborators()
    {
        return $this->belongsToMany(User::class, 'task_assignees', 'task_id', 'user_id')
            ->wherePivot('role', AssigneeRole::Assignee->value)
            ->withPivot(['role', 'assigned_at', 'assigned_by'])
            ->orderBy('task_assignees.assigned_at');
    }

    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    public function tags()
    {
        return $this->belongsToMany(Tag::class, 'task_tag');
    }

    // ── Scopes ─────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->whereNotIn('state', [TaskState::Done->value, TaskState::Cancelled->value]);
    }

    public function scopeOverdue($query)
    {
        return $query->active()->whereNotNull('due_at')->where('due_at', '<', now());
    }

    public function scopeAssignedTo($query, string $userId)
    {
        return $query->where('assignee_id', $userId);
    }

    // ── Helpers ────────────────────────────────────────────────────────

    public function isOverdue(): bool
    {
        return $this->due_at && $this->due_at->isPast() && $this->state->isActive();
    }

    public function addWatcher(string $userId, ?string $assignedBy = null): void
    {
        $this->assignees()->syncWithoutDetaching([
            $userId => [
                'tenant_id' => $this->tenant_id,
                'role' => AssigneeRole::Watcher->value,
                'assigned_at' => now(),
                'assigned_by' => $assignedBy,
            ],
        ]);
    }
}
