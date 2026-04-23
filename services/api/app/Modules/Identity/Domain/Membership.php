<?php

declare(strict_types=1);

namespace App\Modules\Identity\Domain;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\Enums\MembershipStatus;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $user_id
 * @property MembershipRole $role
 * @property MembershipStatus $status
 * @property ?\DateTimeInterface $joined_at
 * @property ?\DateTimeInterface $last_active_at
 */
class Membership extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'memberships';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'role',
        'status',
        'invited_by',
        'joined_at',
        'last_active_at',
    ];

    protected $casts = [
        'role' => MembershipRole::class,
        'status' => MembershipStatus::class,
        'joined_at' => 'datetime',
        'last_active_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    public function scopeActive($query)
    {
        return $query->where('status', MembershipStatus::Active->value);
    }
}
