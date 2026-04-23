<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    public function test_registro_de_tenant_crea_tenant_mas_admin(): void
    {
        $response = $this->postJson('/api/v1/tenants/register', [
            'slug' => 'test-co',
            'name' => 'Test Co',
            'admin_email' => 'admin@test-co.test',
            'admin_name' => 'Admin User',
            'admin_password' => 'passwordSecure1234',
            'plan' => 'starter',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'tenant' => ['id', 'slug', 'name', 'plan', 'status'],
                'message',
            ]);

        $this->assertDatabaseHas('tenants', [
            'slug' => 'test-co',
            'status' => 'trialing',
        ]);
        $this->assertDatabaseHas('users', [
            'email' => 'admin@test-co.test',
        ]);
    }

    public function test_registro_rechaza_slug_duplicado(): void
    {
        $this->createTenant(['slug' => 'dup']);

        $response = $this->postJson('/api/v1/tenants/register', [
            'slug' => 'dup',
            'name' => 'Dup',
            'admin_email' => 'a@b.test',
            'admin_name' => 'A',
            'admin_password' => 'passwordSecure1234',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['slug']);
    }

    public function test_registro_rechaza_slug_reservado(): void
    {
        $response = $this->postJson('/api/v1/tenants/register', [
            'slug' => 'www',
            'name' => 'WWW',
            'admin_email' => 'a@b.test',
            'admin_name' => 'A',
            'admin_password' => 'passwordSecure1234',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['slug']);
    }

    public function test_login_exitoso_retorna_user_mas_tenant(): void
    {
        $tenant = $this->createTenant(['slug' => 'acme-login']);
        $user = $this->createUser('login@test.dev');
        $this->createMembership($tenant, $user, MembershipRole::TenantAdmin);

        $response = $this->withHeaders([
            'X-Tenant-Slug' => 'acme-login',
        ])->postJson('/api/v1/auth/login', [
            'email' => 'login@test.dev',
            'password' => 'password1234secure',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'user' => ['id', 'email', 'name', 'role'],
                'tenant' => ['id', 'slug', 'name'],
            ]);
        $this->assertSame('tenant_admin', $response->json('user.role'));
    }

    public function test_login_rechaza_user_de_otro_tenant(): void
    {
        $tenantA = $this->createTenant(['slug' => 'alpha']);
        $tenantB = $this->createTenant(['slug' => 'beta']);
        $user = $this->createUser('user@cross.dev');
        $this->createMembership($tenantA, $user);
        // El user NO pertenece a tenantB

        $response = $this->withHeaders([
            'X-Tenant-Slug' => 'beta',
        ])->postJson('/api/v1/auth/login', [
            'email' => 'user@cross.dev',
            'password' => 'password1234secure',
        ]);

        $response->assertStatus(422);
    }

    public function test_login_rechaza_credenciales_invalidas(): void
    {
        $tenant = $this->createTenant(['slug' => 'bad-creds']);
        $user = $this->createUser('bad@test.dev');
        $this->createMembership($tenant, $user);

        $response = $this->withHeaders([
            'X-Tenant-Slug' => 'bad-creds',
        ])->postJson('/api/v1/auth/login', [
            'email' => 'bad@test.dev',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(422);
    }

    public function test_me_requiere_autenticacion(): void
    {
        $tenant = $this->createTenant(['slug' => 'need-auth']);

        $response = $this->withHeaders([
            'X-Tenant-Slug' => 'need-auth',
        ])->getJson('/api/v1/auth/me');

        $response->assertStatus(401);
    }

    public function test_tenant_no_resuelto_devuelve_400(): void
    {
        // Sin header ni subdomain válido
        $response = $this->getJson('/api/v1/auth/me');
        $response->assertStatus(400);
    }
}
