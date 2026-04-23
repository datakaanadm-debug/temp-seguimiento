<?php

declare(strict_types=1);

namespace App\Modules\Organization\Domain;

use App\Modules\Identity\Domain\User;
use App\Modules\Organization\Domain\Enums\TeamMembershipRole;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $team_id
 * @property string $user_id
 * @property TeamMembershipRole $role
 * @property ?\DateTimeInterface $joined_at
 * @property ?\DateTimeInterface $left_at
 */
class TeamMembership extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'team_memberships';

    protected $fillable = [
        'tenant_id',
        'team_id',
        'user_id',
        'role',
        'joined_at',
        'left_at',
    ];

    protected $casts = [
        'role' => TeamMembershipRole::class,
        'joined_at' => 'datetime',
        'left_at' => 'datetime',
    ];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeActive($query)
    {
        return $query->whereNull('left_at');
    }

    public function isActive(): bool
    {
        return $this->left_at === null;
    }
}
