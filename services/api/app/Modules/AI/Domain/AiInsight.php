<?php

declare(strict_types=1);

namespace App\Modules\AI\Domain;

use App\Modules\AI\Domain\Enums\InsightKind;
use App\Modules\AI\Domain\Enums\InsightSeverity;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $subject_type
 * @property string $subject_id
 * @property InsightKind $kind
 * @property InsightSeverity $severity
 * @property string $title
 * @property ?string $description
 * @property ?array $evidence
 * @property ?float $confidence       0.000 a 1.000
 * @property ?\DateTimeInterface $dismissed_at
 * @property ?string $dismissed_by
 * @property ?\DateTimeInterface $acknowledged_at
 * @property ?string $acknowledged_by
 * @property ?\DateTimeInterface $resolved_at
 */
class AiInsight extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'ai_insights';

    protected $fillable = [
        'tenant_id',
        'subject_type',
        'subject_id',
        'kind',
        'severity',
        'title',
        'description',
        'evidence',
        'confidence',
        'dismissed_at',
        'dismissed_by',
        'acknowledged_at',
        'acknowledged_by',
        'resolved_at',
    ];

    protected $casts = [
        'kind' => InsightKind::class,
        'severity' => InsightSeverity::class,
        'evidence' => 'array',
        'confidence' => 'decimal:3',
        'dismissed_at' => 'datetime',
        'acknowledged_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function scopeActive($query)
    {
        return $query->whereNull('dismissed_at')->whereNull('resolved_at');
    }

    public function isActive(): bool
    {
        return $this->dismissed_at === null && $this->resolved_at === null;
    }
}
