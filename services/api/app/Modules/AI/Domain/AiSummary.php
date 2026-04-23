<?php

declare(strict_types=1);

namespace App\Modules\AI\Domain;

use App\Modules\AI\Domain\Enums\SummaryKind;
use App\Modules\Identity\Domain\User;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $subject_type
 * @property string $subject_id
 * @property SummaryKind $kind
 * @property string $model
 * @property ?int $prompt_tokens
 * @property ?int $completion_tokens
 * @property ?float $cost_usd
 * @property string $content
 * @property ?\DateTimeInterface $approved_at
 * @property ?string $approved_by
 */
class AiSummary extends BaseModel
{
    use BelongsToTenant;

    public $timestamps = false;

    protected $table = 'ai_summaries';

    protected $fillable = [
        'tenant_id',
        'subject_type',
        'subject_id',
        'kind',
        'model',
        'prompt_tokens',
        'completion_tokens',
        'cost_usd',
        'content',
        'approved_at',
        'approved_by',
        'created_at',
    ];

    protected $casts = [
        'kind' => SummaryKind::class,
        'prompt_tokens' => 'integer',
        'completion_tokens' => 'integer',
        'cost_usd' => 'decimal:4',
        'approved_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function isApproved(): bool
    {
        return $this->approved_at !== null;
    }
}
