<?php

declare(strict_types=1);

namespace Tests;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\Enums\MembershipStatus;
use App\Modules\Identity\Domain\Enums\TenantPlan;
use App\Modules\Identity\Domain\Enums\TenantStatus;
use App\Modules\Identity\Domain\Membership;
use App\Modules\Identity\Domain\Tenant;
use App\Modules\Identity\Domain\User;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Limpiar contexto entre tests para evitar filtraciones entre ejecuciones
        TenantContext::clear();
    }

    /**
     * Crea un tenant listo para operar (status active) y lo bindea al contexto.
     */
    protected function createTenant(array $overrides = []): Tenant
    {
        $slug = $overrides['slug'] ?? 't' . substr(Str::uuid()->toString(), 0, 8);

        $tenant = Tenant::query()->withoutGlobalScopes()->create(array_merge([
            'slug' => $slug,
            'name' => ucfirst($slug),
            'plan' => TenantPlan::Growth,
            'status' => TenantStatus::Active,
            'settings' => ['ai_enabled' => true],
            'theme' => [],
            'data_residency' => 'latam',
        ], $overrides));

        return $tenant;
    }

    protected function createUser(string $email = null): User
    {
        return User::query()->create([
            'email' => $email ?? Str::uuid() . '@test.dev',
            'name' => 'Test User',
            'password_hash' => Hash::make('password1234secure'),
            'email_verified_at' => now(),
        ]);
    }

    protected function createMembership(Tenant $tenant, User $user, MembershipRole $role = MembershipRole::Intern): Membership
    {
        TenantContext::setCurrent($tenant);
        return Membership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => $role->value,
            'status' => MembershipStatus::Active->value,
            'joined_at' => now(),
        ]);
    }

    /**
     * Ejecuta $cb bajo el contexto del tenant dado.
     */
    protected function asTenant(Tenant $tenant, \Closure $cb): mixed
    {
        return TenantContext::run($tenant->id, fn () => $cb());
    }
}
