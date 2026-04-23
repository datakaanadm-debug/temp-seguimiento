<?php

declare(strict_types=1);

namespace App\Modules\Identity\Domain;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Shared\Support\Uuid;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

/**
 * User = persona con credenciales. Global (no scoped a tenant — multi-tenant vía memberships).
 *
 * Un user puede estar en N tenants (fase 2). En MVP: 1 user, 1 tenant.
 *
 * @property string $id
 * @property string $email
 * @property ?string $name
 * @property ?string $avatar_url
 * @property string $locale
 * @property string $timezone
 */
class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasRoles, HasUuids, Notifiable, SoftDeletes;

    protected $table = 'users';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'email',
        'name',
        'avatar_url',
        'locale',
        'timezone',
    ];

    protected $hidden = [
        'password_hash',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
        'two_factor_confirmed_at' => 'datetime',
        'two_factor_secret' => 'encrypted',
        'two_factor_recovery_codes' => 'encrypted',
    ];

    public function newUniqueId(): string
    {
        return Uuid::v7();
    }

    // Laravel espera getAuthPassword() devolver el hash del password
    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    public function getAuthPasswordName(): string
    {
        return 'password_hash';
    }

    /**
     * Sanctum requiere esto para verificar emails.
     */
    public function getEmailForVerification(): string
    {
        return $this->email;
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class);
    }

    public function oauthProviders(): HasMany
    {
        return $this->hasMany(OAuthProvider::class);
    }

    /**
     * La membership activa en el tenant actual (si hay contexto).
     */
    public function currentMembership(): ?Membership
    {
        if (!TenantContext::has()) {
            return null;
        }

        return $this->memberships()
            ->where('tenant_id', TenantContext::currentId())
            ->where('status', 'active')
            ->first();
    }

    public function primaryRole(): ?MembershipRole
    {
        $membership = $this->currentMembership();
        if (!$membership) {
            return null;
        }
        $role = $membership->role;
        return $role instanceof MembershipRole ? $role : MembershipRole::from($role);
    }

    /**
     * Required por Spatie's HasRoles (teams mode) para saber a qué team (=tenant) pertenece.
     */
    public function getDefaultTeamId(): ?string
    {
        return TenantContext::has() ? TenantContext::currentId() : null;
    }
}
