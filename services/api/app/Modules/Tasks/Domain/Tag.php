<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Domain;

use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $name
 * @property string $slug
 * @property string $color
 */
class Tag extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'tags';

    protected $fillable = [
        'tenant_id',
        'name',
        'slug',
        'color',
        'created_by',
    ];

    protected $attributes = [
        'color' => '#64748B',
    ];

    public function tasks()
    {
        return $this->belongsToMany(Task::class, 'task_tag');
    }
}
