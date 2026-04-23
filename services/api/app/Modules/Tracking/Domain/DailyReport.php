<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Domain;

use App\Modules\Identity\Domain\User;
use App\Modules\Tracking\Domain\Enums\DailyReportStatus;
use App\Modules\Tracking\Domain\Enums\Mood;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $user_id
 * @property \DateTimeInterface $report_date
 * @property DailyReportStatus $status
 * @property string $progress_summary
 * @property ?string $blockers_text
 * @property ?string $plan_tomorrow
 * @property ?Mood $mood
 * @property ?float $hours_worked
 * @property ?string $ai_summary_id
 * @property ?\DateTimeInterface $submitted_at
 * @property ?string $reviewed_by
 * @property ?\DateTimeInterface $reviewed_at
 */
class DailyReport extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'daily_reports';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'report_date',
        'status',
        'progress_summary',
        'blockers_text',
        'plan_tomorrow',
        'mood',
        'hours_worked',
        'ai_summary_id',
        'submitted_at',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'report_date' => 'date',
        'status' => DailyReportStatus::class,
        'mood' => Mood::class,
        'hours_worked' => 'decimal:2',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function blockers(): HasMany
    {
        return $this->hasMany(Blocker::class);
    }

    public function scopeForDate($query, $date)
    {
        return $query->whereDate('report_date', $date);
    }

    public function scopeForUser($query, string $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeSubmitted($query)
    {
        return $query->where('status', DailyReportStatus::Submitted->value);
    }

    public function markSubmitted(): void
    {
        $this->status = DailyReportStatus::Submitted;
        $this->submitted_at = $this->submitted_at ?? now();
    }
}
