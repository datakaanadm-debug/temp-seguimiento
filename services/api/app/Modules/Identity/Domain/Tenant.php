<?php

declare(strict_types=1);

namespace App\Modules\Identity\Domain;

use App\Modules\Identity\Domain\Enums\TenantPlan;
use App\Modules\Identity\Domain\Enums\TenantStatus;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Tenant = empresa/cliente del SaaS.
 *
 * NO usa BelongsToTenant. Es la tabla raíz; sus queries no se scopean a un tenant.
 *
 * @property string $id
 * @property string $slug
 * @property string $name
 * @property TenantPlan $plan
 * @property TenantStatus $status
 * @property array $settings
 * @property array $theme
 * @property string $data_residency
 * @property ?string $stripe_customer_id
 * @property ?\DateTimeInterface $trial_ends_at
 * @property ?\DateTimeInterface $suspended_at
 */
class Tenant extends BaseModel
{
    protected $table = 'tenants';

    protected $fillable = [
        'slug',
        'name',
        'plan',
        'status',
        'settings',
        'theme',
        'data_residency',
        'stripe_customer_id',
        'trial_ends_at',
        'suspended_at',
    ];

    protected $casts = [
        'plan' => TenantPlan::class,
        'status' => TenantStatus::class,
        'settings' => 'array',
        'theme' => 'array',
        'trial_ends_at' => 'datetime',
        'suspended_at' => 'datetime',
    ];

    protected $attributes = [
        'plan' => 'starter',
        'status' => 'trialing',
        'data_residency' => 'latam',
    ];

    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class);
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(Invitation::class);
    }

    public function users()
    {
        return $this->hasManyThrough(User::class, Membership::class, 'tenant_id', 'id', 'id', 'user_id');
    }

    public function isAiEnabled(): bool
    {
        return (bool) ($this->settings['ai_enabled'] ?? true);
    }

    public function canOperate(): bool
    {
        return $this->status->canOperate();
    }
}
