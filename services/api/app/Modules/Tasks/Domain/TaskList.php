<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Domain;

use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Una "lista" estilo columna Kanban dentro de un Project.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $project_id
 * @property string $name
 * @property int $position
 * @property ?string $color
 * @property ?int $wip_limit
 */
class TaskList extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'task_lists';

    protected $fillable = [
        'tenant_id',
        'project_id',
        'name',
        'position',
        'color',
        'wip_limit',
    ];

    protected $casts = [
        'position' => 'integer',
        'wip_limit' => 'integer',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'list_id')->orderBy('position');
    }

    public function isOverWipLimit(): bool
    {
        if (!$this->wip_limit) {
            return false;
        }
        return $this->tasks()->whereNull('deleted_at')->count() >= $this->wip_limit;
    }
}
