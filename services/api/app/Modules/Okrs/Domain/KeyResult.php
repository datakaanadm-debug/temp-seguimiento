<?php

declare(strict_types=1);

namespace App\Modules\Okrs\Domain;

use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KeyResult extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'key_results';

    protected $fillable = [
        'tenant_id', 'objective_id', 'position', 'text',
        'progress_percent', 'confidence', 'unit',
        'target_value', 'current_value',
    ];

    protected $casts = [
        'position' => 'integer',
        'progress_percent' => 'integer',
        'confidence' => 'integer',
        'target_value' => 'decimal:2',
        'current_value' => 'decimal:2',
    ];

    public function objective(): BelongsTo
    {
        return $this->belongsTo(Objective::class);
    }

    public function checkIns(): HasMany
    {
        return $this->hasMany(OkrCheckIn::class);
    }
}
