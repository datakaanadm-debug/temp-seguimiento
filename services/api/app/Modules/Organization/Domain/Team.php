<?php

declare(strict_types=1);

namespace App\Modules\Organization\Domain;

use App\Modules\Identity\Domain\User;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $area_id
 * @property string $name
 * @property string $slug
 * @property ?string $lead_user_id
 * @property string $color
 * @property array $metadata
 */
class Team extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'teams';

    protected $fillable = [
        'tenant_id',
        'area_id',
        'name',
        'slug',
        'lead_user_id',
        'color',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    protected $attributes = [
        'color' => '#0891B2',
    ];

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lead_user_id');
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(TeamMembership::class)->whereNull('left_at');
    }

    public function activeMembers()
    {
        return $this->belongsToMany(User::class, 'team_memberships')
            ->withPivot(['role', 'joined_at', 'left_at'])
            ->wherePivotNull('left_at');
    }
}
