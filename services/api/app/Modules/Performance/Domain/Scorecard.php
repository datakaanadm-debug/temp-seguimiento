<?php

declare(strict_types=1);

namespace App\Modules\Performance\Domain;

use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $name
 * @property ?string $description
 * @property string $applicable_to     intern|mentor|staff
 * @property bool $is_active
 */
class Scorecard extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'scorecards';

    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'applicable_to',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function metrics(): HasMany
    {
        return $this->hasMany(ScorecardMetric::class)->orderBy('position');
    }

    public function evaluations(): HasMany
    {
        return $this->hasMany(Evaluation::class);
    }
}
