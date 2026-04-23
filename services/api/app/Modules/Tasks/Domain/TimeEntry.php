<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Domain;

use App\Modules\Identity\Domain\User;
use App\Modules\Tasks\Domain\Enums\TimeEntrySource;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $task_id
 * @property string $user_id
 * @property \DateTimeInterface $started_at
 * @property ?\DateTimeInterface $ended_at
 * @property ?int $duration_minutes
 * @property ?string $note
 * @property TimeEntrySource $source
 */
class TimeEntry extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'time_entries';

    protected $fillable = [
        'tenant_id',
        'task_id',
        'user_id',
        'started_at',
        'ended_at',
        'duration_minutes',
        'note',
        'source',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'duration_minutes' => 'integer',
        'source' => TimeEntrySource::class,
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isRunning(): bool
    {
        return $this->ended_at === null;
    }

    public function scopeRunning($query)
    {
        return $query->whereNull('ended_at');
    }

    public function scopeForUser($query, string $userId)
    {
        return $query->where('user_id', $userId);
    }
}
