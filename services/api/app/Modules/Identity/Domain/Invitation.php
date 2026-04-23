<?php

declare(strict_types=1);

namespace App\Modules\Identity\Domain;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Invitación activa o histórica para unirse a un tenant.
 *
 * El token nunca se persiste en claro; solo su SHA-256.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $email
 * @property string $token_hash
 * @property MembershipRole $role
 * @property ?string $team_id
 * @property ?string $mentor_id
 * @property \DateTimeInterface $expires_at
 * @property ?\DateTimeInterface $accepted_at
 * @property ?string $accepted_by
 * @property string $invited_by
 * @property ?\DateTimeInterface $revoked_at
 */
class Invitation extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'invitations';

    protected $fillable = [
        'tenant_id',
        'email',
        'token_hash',
        'role',
        'team_id',
        'mentor_id',
        'expires_at',
        'invited_by',
    ];

    protected $casts = [
        'role' => MembershipRole::class,
        'expires_at' => 'datetime',
        'accepted_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    public function acceptedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accepted_by');
    }

    public function mentor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'mentor_id');
    }

    public function isPending(): bool
    {
        return $this->accepted_at === null
            && $this->revoked_at === null
            && $this->expires_at?->isFuture();
    }

    public function isExpired(): bool
    {
        return $this->accepted_at === null
            && $this->revoked_at === null
            && $this->expires_at?->isPast();
    }

    public function scopePending($query)
    {
        return $query
            ->whereNull('accepted_at')
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now());
    }
}
