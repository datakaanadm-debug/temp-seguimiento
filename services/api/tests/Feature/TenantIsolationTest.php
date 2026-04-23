<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\Invitation;
use App\Modules\Identity\Domain\Membership;
use App\Modules\Identity\Domain\Tenant;
use App\Shared\Exceptions\TenantContextMissing;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Tests de aislamiento multi-tenant. Si UNO falla, no se mergea el PR.
 *
 * @see docs/architecture/02-multi-tenancy.md
 */
class TenantIsolationTest extends TestCase
{
    public function test_membership_scope_filtra_por_tenant_actual(): void
    {
        $tenantA = $this->createTenant(['slug' => 'acme-a']);
        $tenantB = $this->createTenant(['slug' => 'acme-b']);

        $userA = $this->createUser('user-a@test.dev');
        $userB = $this->createUser('user-b@test.dev');

        $this->createMembership($tenantA, $userA, MembershipRole::Intern);
        $this->createMembership($tenantB, $userB, MembershipRole::Intern);

        // Contexto tenant A: solo debo ver 1 membership
        TenantContext::setCurrent($tenantA);
        $this->assertSame(1, Membership::count());
        $this->assertTrue(Membership::where('user_id', $userA->id)->exists());
        $this->assertFalse(Membership::where('user_id', $userB->id)->exists());

        // Cambio a tenant B: veo solo la otra
        TenantContext::setCurrent($tenantB);
        $this->assertSame(1, Membership::count());
        $this->assertFalse(Membership::where('user_id', $userA->id)->exists());
        $this->assertTrue(Membership::where('user_id', $userB->id)->exists());
    }

    public function test_rls_bloquea_queries_directas_sin_tenant_context(): void
    {
        $tenantA = $this->createTenant(['slug' => 'rls-a']);
        $tenantB = $this->createTenant(['slug' => 'rls-b']);

        $userA = $this->createUser();
        $userB = $this->createUser();

        $this->createMembership($tenantA, $userA);
        $this->createMembership($tenantB, $userB);

        // Query cruda via DB facade (sin Eloquent scope)
        DB::statement("SELECT set_config('app.tenant_id', ?, false)", [$tenantA->id]);
        $this->assertSame(1, DB::table('memberships')->count());

        DB::statement("SELECT set_config('app.tenant_id', ?, false)", [$tenantB->id]);
        $this->assertSame(1, DB::table('memberships')->count());

        // Sin contexto: RLS bloquea todo
        DB::statement("SELECT set_config('app.tenant_id', '', false)");
        $this->assertSame(0, DB::table('memberships')->count());
    }

    public function test_crear_modelo_sin_tenant_context_lanza_excepcion(): void
    {
        $this->createUser();
        TenantContext::clear();

        $this->expectException(TenantContextMissing::class);

        Membership::create([
            'user_id' => '00000000-0000-0000-0000-000000000000',
            'role' => 'intern',
            'status' => 'active',
        ]);
    }

    public function test_intento_de_forzar_tenant_id_en_request_es_ignorado(): void
    {
        $tenantA = $this->createTenant(['slug' => 'hack-a']);
        $tenantB = $this->createTenant(['slug' => 'hack-b']);

        $userA = $this->createUser('attacker@test.dev');
        $this->createMembership($tenantA, $userA);

        TenantContext::setCurrent($tenantA);

        // Aunque el código intente pasar un tenant_id de otro tenant,
        // BelongsToTenant fuerza el del contexto en `creating`
        $invitation = new Invitation();
        $invitation->email = 'x@test.dev';
        $invitation->token_hash = str_repeat('a', 64);
        $invitation->role = MembershipRole::Intern->value;
        $invitation->invited_by = $userA->id;
        $invitation->expires_at = now()->addDay();
        $invitation->tenant_id = $tenantB->id; // intento de forzar
        $invitation->save();

        // El modelo guardado debe llevar el tenant del contexto, no el inyectado
        $saved = Invitation::query()->withoutGlobalScopes()->find($invitation->id);
        $this->assertSame($tenantA->id, $saved->tenant_id);
    }

    public function test_tenant_context_run_restaura_contexto_previo(): void
    {
        $tenantA = $this->createTenant();
        $tenantB = $this->createTenant();

        TenantContext::setCurrent($tenantA);
        $this->assertSame($tenantA->id, TenantContext::currentId());

        TenantContext::run($tenantB->id, function () use ($tenantB) {
            $this->assertSame($tenantB->id, TenantContext::currentId());
        });

        // Al salir, el contexto vuelve a A
        $this->assertSame($tenantA->id, TenantContext::currentId());
    }

    public function test_tenant_context_run_restaura_estado_limpio_si_no_habia_contexto(): void
    {
        TenantContext::clear();
        $tenantA = $this->createTenant();

        TenantContext::run($tenantA->id, function () use ($tenantA) {
            $this->assertSame($tenantA->id, TenantContext::currentId());
        });

        $this->assertFalse(TenantContext::has());
    }
}
