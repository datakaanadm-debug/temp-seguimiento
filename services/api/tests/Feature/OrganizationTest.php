<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Organization\Application\Commands\AddTeamMember;
use App\Modules\Organization\Application\Commands\AddTeamMemberHandler;
use App\Modules\Organization\Application\Commands\CreateArea;
use App\Modules\Organization\Application\Commands\CreateAreaHandler;
use App\Modules\Organization\Application\Commands\CreateDepartment;
use App\Modules\Organization\Application\Commands\CreateDepartmentHandler;
use App\Modules\Organization\Application\Commands\CreateTeam;
use App\Modules\Organization\Application\Commands\CreateTeamHandler;
use App\Modules\Organization\Application\Commands\RemoveTeamMember;
use App\Modules\Organization\Application\Commands\RemoveTeamMemberHandler;
use App\Modules\Organization\Domain\Department;
use App\Modules\Organization\Domain\TeamMembership;
use App\Shared\Tenancy\TenantContext;
use Tests\TestCase;

class OrganizationTest extends TestCase
{
    public function test_crear_department_area_team_en_cascada(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createUser();
        $this->createMembership($tenant, $admin, MembershipRole::TenantAdmin);
        TenantContext::setCurrent($tenant);

        $dep = app(CreateDepartmentHandler::class)->handle(
            new CreateDepartment('Tecnología', 'tech', $admin)
        );
        $area = app(CreateAreaHandler::class)->handle(
            new CreateArea($dep->id, 'Producto', 'producto', $admin)
        );
        $team = app(CreateTeamHandler::class)->handle(
            new CreateTeam($area->id, 'Diseño', 'diseno', $admin, leadUserId: $admin->id)
        );

        $this->assertSame($tenant->id, $dep->tenant_id);
        $this->assertSame($dep->id, $area->department_id);
        $this->assertSame($area->id, $team->area_id);
        $this->assertSame($admin->id, $team->lead_user_id);

        // Lead auto-inscrito como miembro
        $this->assertDatabaseHas('team_memberships', [
            'team_id' => $team->id,
            'user_id' => $admin->id,
            'role' => 'lead',
        ]);
    }

    public function test_team_aislado_por_tenant(): void
    {
        $tenantA = $this->createTenant(['slug' => 'a-org']);
        $tenantB = $this->createTenant(['slug' => 'b-org']);
        $userA = $this->createUser();
        $userB = $this->createUser();
        $this->createMembership($tenantA, $userA, MembershipRole::TenantAdmin);
        $this->createMembership($tenantB, $userB, MembershipRole::TenantAdmin);

        $this->asTenant($tenantA, function () use ($userA) {
            $dep = app(CreateDepartmentHandler::class)->handle(new CreateDepartment('Dep A', 'dep-a', $userA));
            $area = app(CreateAreaHandler::class)->handle(new CreateArea($dep->id, 'Area A', 'area-a', $userA));
            app(CreateTeamHandler::class)->handle(new CreateTeam($area->id, 'Team A', 'team-a', $userA));
        });
        $this->asTenant($tenantB, function () use ($userB) {
            $dep = app(CreateDepartmentHandler::class)->handle(new CreateDepartment('Dep B', 'dep-b', $userB));
            $area = app(CreateAreaHandler::class)->handle(new CreateArea($dep->id, 'Area B', 'area-b', $userB));
            app(CreateTeamHandler::class)->handle(new CreateTeam($area->id, 'Team B', 'team-b', $userB));
        });

        TenantContext::setCurrent($tenantA);
        $this->assertSame(1, Department::count());
        $this->assertSame('Dep A', Department::first()->name);
    }

    public function test_add_y_remove_team_member_con_idempotencia(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createUser();
        $this->createMembership($tenant, $admin, MembershipRole::TenantAdmin);
        TenantContext::setCurrent($tenant);

        $dep = app(CreateDepartmentHandler::class)->handle(new CreateDepartment('D', 'd', $admin));
        $area = app(CreateAreaHandler::class)->handle(new CreateArea($dep->id, 'A', 'a', $admin));
        $team = app(CreateTeamHandler::class)->handle(new CreateTeam($area->id, 'T', 't', $admin));

        $intern = $this->createUser('intern-org@x.test');

        $m1 = app(AddTeamMemberHandler::class)->handle(new AddTeamMember($team->id, $intern->id, 'intern', $admin));
        $m2 = app(AddTeamMemberHandler::class)->handle(new AddTeamMember($team->id, $intern->id, 'intern', $admin));
        $this->assertSame($m1->id, $m2->id, 'agregar dos veces debe ser idempotente');

        app(RemoveTeamMemberHandler::class)->handle(new RemoveTeamMember($m1->id, $admin));
        $this->assertNotNull(TeamMembership::find($m1->id)->left_at);

        // Remove otra vez: idempotente, no rompe
        $removed = app(RemoveTeamMemberHandler::class)->handle(new RemoveTeamMember($m1->id, $admin));
        $this->assertNotNull($removed->left_at);
    }
}
