<?php

declare(strict_types=1);

namespace App\Modules\Performance\Domain;

use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $evaluation_id
 * @property string $metric_id
 * @property ?float $value_numeric
 * @property ?string $value_text
 * @property ?array $value_json
 * @property ?float $auto_value       valor computado automáticamente (source=tasks, reviews, etc.)
 */
class EvaluationResponse extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'evaluation_responses';

    protected $fillable = [
        'tenant_id',
        'evaluation_id',
        'metric_id',
        'value_numeric',
        'value_text',
        'value_json',
        'auto_value',
    ];

    protected $casts = [
        'value_numeric' => 'decimal:2',
        'auto_value' => 'decimal:2',
        'value_json' => 'array',
    ];

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(Evaluation::class);
    }

    public function metric(): BelongsTo
    {
        return $this->belongsTo(ScorecardMetric::class, 'metric_id');
    }
}
