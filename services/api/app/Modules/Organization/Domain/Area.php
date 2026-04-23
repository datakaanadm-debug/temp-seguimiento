<?php

declare(strict_types=1);

namespace App\Modules\Organization\Domain;

use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $department_id
 * @property string $name
 * @property string $slug
 * @property int $position
 */
class Area extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'areas';

    protected $fillable = [
        'tenant_id',
        'department_id',
        'name',
        'slug',
        'position',
    ];

    protected $casts = [
        'position' => 'integer',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }
}
