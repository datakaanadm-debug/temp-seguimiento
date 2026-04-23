<?php

declare(strict_types=1);

namespace App\Modules\Performance\Domain;

use App\Modules\Identity\Domain\User;
use App\Modules\Performance\Domain\Enums\EvaluationKind;
use App\Modules\Performance\Domain\Enums\EvaluationStatus;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $scorecard_id
 * @property string $subject_user_id
 * @property ?string $evaluator_user_id
 * @property EvaluationKind $kind
 * @property ?\DateTimeInterface $scheduled_for
 * @property ?\DateTimeInterface $started_at
 * @property ?\DateTimeInterface $submitted_at
 * @property ?\DateTimeInterface $signed_at
 * @property ?\DateTimeInterface $acknowledged_at
 * @property EvaluationStatus $status
 * @property ?float $overall_score
 * @property ?string $narrative
 * @property ?string $ai_draft_narrative
 */
class Evaluation extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'evaluations';

    protected $fillable = [
        'tenant_id',
        'scorecard_id',
        'subject_user_id',
        'evaluator_user_id',
        'kind',
        'scheduled_for',
        'started_at',
        'submitted_at',
        'signed_at',
        'acknowledged_at',
        'status',
        'overall_score',
        'narrative',
        'ai_draft_narrative',
    ];

    protected $casts = [
        'kind' => EvaluationKind::class,
        'status' => EvaluationStatus::class,
        'scheduled_for' => 'date',
        'started_at' => 'datetime',
        'submitted_at' => 'datetime',
        'signed_at' => 'datetime',
        'acknowledged_at' => 'datetime',
        'overall_score' => 'decimal:2',
    ];

    public function scorecard(): BelongsTo
    {
        return $this->belongsTo(Scorecard::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(User::class, 'subject_user_id');
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluator_user_id');
    }

    public function responses(): HasMany
    {
        return $this->hasMany(EvaluationResponse::class);
    }
}
