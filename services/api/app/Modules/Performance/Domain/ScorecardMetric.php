<?php

declare(strict_types=1);

namespace App\Modules\Performance\Domain;

use App\Modules\Performance\Domain\Enums\MetricType;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $scorecard_id
 * @property string $key              tasks_on_time|avg_review_score|...
 * @property string $label
 * @property MetricType $type
 * @property ?string $source          tasks|reviews|time|...
 * @property ?float $target_value
 * @property ?string $unit            percent|score|hours
 * @property float $weight
 * @property array $config            likert labels, rubric, etc.
 * @property int $position
 */
class ScorecardMetric extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'scorecard_metrics';

    protected $fillable = [
        'tenant_id',
        'scorecard_id',
        'key',
        'label',
        'type',
        'source',
        'target_value',
        'unit',
        'weight',
        'config',
        'position',
    ];

    protected $casts = [
        'type' => MetricType::class,
        'target_value' => 'decimal:2',
        'weight' => 'decimal:2',
        'config' => 'array',
        'position' => 'integer',
    ];

    public function scorecard(): BelongsTo
    {
        return $this->belongsTo(Scorecard::class);
    }
}
