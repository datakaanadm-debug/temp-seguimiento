<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Domain;

use App\Modules\Identity\Domain\User;
use App\Modules\Tasks\Domain\Task;
use App\Modules\Tracking\Domain\Enums\BlockerSeverity;
use App\Modules\Tracking\Domain\Enums\BlockerStatus;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $raised_by
 * @property ?string $related_task_id
 * @property ?string $daily_report_id
 * @property string $title
 * @property ?string $description
 * @property BlockerSeverity $severity
 * @property BlockerStatus $status
 * @property ?\DateTimeInterface $resolved_at
 * @property ?string $resolution
 * @property ?string $resolved_by
 */
class Blocker extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'blockers';

    protected $fillable = [
        'tenant_id',
        'raised_by',
        'related_task_id',
        'daily_report_id',
        'title',
        'description',
        'severity',
        'status',
        'resolved_at',
        'resolution',
        'resolved_by',
    ];

    protected $casts = [
        'severity' => BlockerSeverity::class,
        'status' => BlockerStatus::class,
        'resolved_at' => 'datetime',
    ];

    public function raiser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'raised_by');
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function relatedTask(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'related_task_id');
    }

    public function dailyReport(): BelongsTo
    {
        return $this->belongsTo(DailyReport::class);
    }

    public function scopeOpen($query)
    {
        return $query->whereIn('status', [BlockerStatus::Open->value, BlockerStatus::Acknowledged->value]);
    }
}
