<?php

declare(strict_types=1);

namespace App\Modules\Okrs\Domain;

use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Objective extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'objectives';

    protected $fillable = [
        'tenant_id', 'level', 'label', 'quarter',
        'owner_type', 'owner_id', 'owner_name',
        'parent_objective_id', 'starts_at', 'ends_at', 'status',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

    public function keyResults(): HasMany
    {
        return $this->hasMany(KeyResult::class)->orderBy('position');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_objective_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_objective_id');
    }
}
