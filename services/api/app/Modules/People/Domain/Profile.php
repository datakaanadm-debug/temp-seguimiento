<?php

declare(strict_types=1);

namespace App\Modules\People\Domain;

use App\Modules\Identity\Domain\Membership;
use App\Modules\Identity\Domain\User;
use App\Modules\People\Domain\Enums\ProfileKind;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $user_id
 * @property ?string $bio
 * @property ?string $phone                 cifrado app-level
 * @property ?string $national_id           cifrado app-level
 * @property ?\DateTimeInterface $birth_date
 * @property ?string $position_title
 * @property ?\DateTimeInterface $start_date
 * @property ?\DateTimeInterface $end_date
 * @property ProfileKind $kind
 * @property array $skills
 * @property array $social_links
 * @property array $emergency_contact
 */
class Profile extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'profiles';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'bio',
        'phone',
        'national_id',
        'birth_date',
        'position_title',
        'start_date',
        'end_date',
        'hired_at',
        'kind',
        'skills',
        'social_links',
        'emergency_contact',
    ];

    protected $casts = [
        'kind' => ProfileKind::class,
        'birth_date' => 'date',
        'start_date' => 'date',
        'end_date' => 'date',
        'hired_at' => 'datetime',
        'skills' => 'array',
        'social_links' => 'array',
        'emergency_contact' => 'array',
        'phone' => 'encrypted',
        'national_id' => 'encrypted',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function internData(): HasOne
    {
        return $this->hasOne(InternData::class);
    }

    public function mentorData(): HasOne
    {
        return $this->hasOne(MentorData::class);
    }

    /**
     * Membership activa del user en este tenant. Se eager-loadea desde
     * ProfileController para evitar el N+1 en ProfileResource (antes hacía
     * un `DB::table('memberships')->...->first()` por cada profile listado).
     *
     * El join es `profile.user_id + tenant_id → memberships`. Como Profile
     * ya tiene `tenant_id` por BelongsToTenant, el constraint funciona.
     */
    public function activeMembership(): HasOne
    {
        return $this->hasOne(Membership::class, 'user_id', 'user_id')
            ->whereColumn('memberships.tenant_id', 'profiles.tenant_id')
            ->where('memberships.status', 'active');
    }

    public function isIntern(): bool
    {
        return $this->kind === ProfileKind::Intern;
    }

    public function isMentor(): bool
    {
        return $this->kind === ProfileKind::Mentor;
    }
}
