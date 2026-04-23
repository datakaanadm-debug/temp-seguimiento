<?php

declare(strict_types=1);

namespace App\Modules\Organization\Domain;

use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $name
 * @property string $slug
 * @property int $position
 * @property array $metadata
 */
class Department extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'departments';

    protected $fillable = [
        'tenant_id',
        'name',
        'slug',
        'position',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'position' => 'integer',
    ];

    public function areas(): HasMany
    {
        return $this->hasMany(Area::class);
    }
}
