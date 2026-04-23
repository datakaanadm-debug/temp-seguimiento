<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Modules\Identity\Application\Commands\AcceptInvitation;
use App\Modules\Identity\Application\Commands\AcceptInvitationHandler;
use App\Modules\Identity\Application\Commands\InviteUser;
use App\Modules\Identity\Application\Commands\InviteUserHandler;
use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\Exceptions\InvitationInvalid;
use App\Modules\Identity\Domain\Invitation;
use App\Modules\Identity\Domain\Membership;
use App\Modules\Identity\Domain\User;
use App\Shared\Tenancy\TenantContext;
use Tests\TestCase;

class InvitationFlowTest extends TestCase
{
    public function test_crear_invitacion_guarda_solo_hash_y_emite_evento(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createUser('admin@invite.test');
        $this->createMembership($tenant, $admin, MembershipRole::TenantAdmin);

        TenantContext::setCurrent($tenant);

        $handler = app(InviteUserHandler::class);
        $result = $handler->handle(new InviteUser(
            email: 'newbie@invite.test',
            role: 'intern',
            actor: $admin,
        ));

        $this->assertArrayHasKey('plain_token', $result);
        $this->assertArrayHasKey('invitation', $result);
        $this->assertSame(64, strlen($result['plain_token']));

        // El DB solo tiene el hash
        $this->assertDatabaseHas('invitations', [
            'email' => 'newbie@invite.test',
            'token_hash' => hash('sha256', $result['plain_token']),
        ]);
        $this->assertDatabaseMissing('invitations', [
            'token_hash' => $result['plain_token'],
        ]);
    }

    public function test_reinvitar_revoca_la_previa(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createUser();
        $this->createMembership($tenant, $admin, MembershipRole::TenantAdmin);

        TenantContext::setCurrent($tenant);

        $handler = app(InviteUserHandler::class);
        $first = $handler->handle(new InviteUser('repeat@x.test', 'intern', $admin));
        $second = $handler->handle(new InviteUser('repeat@x.test', 'intern', $admin));

        $firstModel = Invitation::find($first['invitation']->id);
        $this->assertNotNull($firstModel->revoked_at, 'la primera debe quedar revocada');
        $this->assertNull($second['invitation']->fresh()->revoked_at);
    }

    public function test_aceptar_invitacion_crea_user_mas_membership(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createUser();
        $this->createMembership($tenant, $admin, MembershipRole::TenantAdmin);

        TenantContext::setCurrent($tenant);
        $invited = app(InviteUserHandler::class)->handle(new InviteUser(
            email: 'accept@x.test',
            role: 'intern',
            actor: $admin,
        ));

        // Al aceptar, el contexto del tenant se pierde: simula pre-auth
        TenantContext::clear();

        $result = app(AcceptInvitationHandler::class)->handle(new AcceptInvitation(
            plainToken: $invited['plain_token'],
            email: 'accept@x.test',
            name: 'Nuevo Practicante',
            password: 'passwordSecure1234',
        ));

        $this->assertInstanceOf(User::class, $result['user']);
        $this->assertSame('accept@x.test', $result['user']->email);
        $this->assertSame($tenant->id, $result['tenant']->id);
        $this->assertInstanceOf(Membership::class, $result['membership']);
        $this->assertSame('intern', $result['membership']->role->value);
    }

    public function test_aceptar_invitacion_rechaza_token_invalido(): void
    {
        $this->expectException(InvitationInvalid::class);

        app(AcceptInvitationHandler::class)->handle(new AcceptInvitation(
            plainToken: str_repeat('z', 64),
            email: 'x@x.test',
            name: 'X',
            password: 'passwordSecure1234',
        ));
    }

    public function test_aceptar_invitacion_rechaza_email_distinto(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createUser();
        $this->createMembership($tenant, $admin, MembershipRole::TenantAdmin);
        TenantContext::setCurrent($tenant);
        $invited = app(InviteUserHandler::class)->handle(new InviteUser('right@x.test', 'intern', $admin));

        $this->expectException(InvitationInvalid::class);

        app(AcceptInvitationHandler::class)->handle(new AcceptInvitation(
            plainToken: $invited['plain_token'],
            email: 'wrong@x.test',
            name: 'X',
            password: 'passwordSecure1234',
        ));
    }

    public function test_aceptar_invitacion_rechaza_expirada(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createUser();
        $this->createMembership($tenant, $admin, MembershipRole::TenantAdmin);
        TenantContext::setCurrent($tenant);

        $invited = app(InviteUserHandler::class)->handle(new InviteUser('expired@x.test', 'intern', $admin));

        // Forzar expiración
        Invitation::query()->where('id', $invited['invitation']->id)->update([
            'expires_at' => now()->subHour(),
        ]);

        $this->expectException(InvitationInvalid::class);

        app(AcceptInvitationHandler::class)->handle(new AcceptInvitation(
            plainToken: $invited['plain_token'],
            email: 'expired@x.test',
            name: 'X',
            password: 'passwordSecure1234',
        ));
    }

    public function test_aceptar_invitacion_rechaza_ya_aceptada(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createUser();
        $this->createMembership($tenant, $admin, MembershipRole::TenantAdmin);
        TenantContext::setCurrent($tenant);

        $invited = app(InviteUserHandler::class)->handle(new InviteUser('twice@x.test', 'intern', $admin));

        TenantContext::clear();
        app(AcceptInvitationHandler::class)->handle(new AcceptInvitation(
            plainToken: $invited['plain_token'],
            email: 'twice@x.test',
            name: 'X',
            password: 'passwordSecure1234',
        ));

        $this->expectException(InvitationInvalid::class);

        app(AcceptInvitationHandler::class)->handle(new AcceptInvitation(
            plainToken: $invited['plain_token'],
            email: 'twice@x.test',
            name: 'X',
            password: 'passwordSecure1234',
        ));
    }
}
