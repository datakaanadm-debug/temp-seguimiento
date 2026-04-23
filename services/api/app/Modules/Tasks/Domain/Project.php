<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Domain;

use App\Modules\Organization\Domain\Team;
use App\Modules\Tasks\Domain\Enums\ProjectStatus;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $team_id
 * @property string $name
 * @property string $slug
 * @property ?string $description
 * @property ProjectStatus $status
 * @property ?string $color
 * @property ?string $cover_url
 * @property ?\DateTimeInterface $start_date
 * @property ?\DateTimeInterface $end_date
 * @property array $metadata
 * @property ?\DateTimeInterface $archived_at
 */
class Project extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'projects';

    protected $fillable = [
        'tenant_id',
        'team_id',
        'name',
        'slug',
        'description',
        'status',
        'color',
        'cover_url',
        'start_date',
        'end_date',
        'metadata',
        'archived_at',
    ];

    protected $casts = [
        'status' => ProjectStatus::class,
        'start_date' => 'date',
        'end_date' => 'date',
        'metadata' => 'array',
        'archived_at' => 'datetime',
    ];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function lists(): HasMany
    {
        return $this->hasMany(TaskList::class)->orderBy('position');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', ProjectStatus::Active->value);
    }
}
