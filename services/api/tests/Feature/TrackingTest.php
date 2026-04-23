<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Tracking\Application\Commands\RaiseBlocker;
use App\Modules\Tracking\Application\Commands\RaiseBlockerHandler;
use App\Modules\Tracking\Application\Commands\ResolveBlocker;
use App\Modules\Tracking\Application\Commands\ResolveBlockerHandler;
use App\Modules\Tracking\Application\Commands\ReviewDailyReport;
use App\Modules\Tracking\Application\Commands\ReviewDailyReportHandler;
use App\Modules\Tracking\Application\Commands\UpsertDailyReport;
use App\Modules\Tracking\Application\Commands\UpsertDailyReportHandler;
use App\Modules\Tracking\Domain\DailyReport;
use App\Modules\Tracking\Domain\Enums\BlockerStatus;
use App\Modules\Tracking\Domain\Enums\DailyReportStatus;
use App\Shared\Tenancy\TenantContext;
use Tests\TestCase;

class TrackingTest extends TestCase
{
    public function test_upsert_crea_y_luego_actualiza_por_fecha(): void
    {
        $tenant = $this->createTenant();
        $intern = $this->createUser();
        $this->createMembership($tenant, $intern, MembershipRole::Intern);
        TenantContext::setCurrent($tenant);

        $first = app(UpsertDailyReportHandler::class)->handle(new UpsertDailyReport(
            user: $intern,
            reportDate: '2026-04-22',
            progressSummary: 'Avancé bastante hoy con los wireframes.',
            submit: true,
        ));
        $this->assertSame(DailyReportStatus::Submitted, $first->status);
        $this->assertNotNull($first->submitted_at);

        // Actualizar: mismo (user, fecha) → mismo record
        $second = app(UpsertDailyReportHandler::class)->handle(new UpsertDailyReport(
            user: $intern,
            reportDate: '2026-04-22',
            progressSummary: 'Actualización del reporte.',
            submit: false,
        ));

        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, DailyReport::count());
    }

    public function test_review_rechaza_self_review(): void
    {
        $tenant = $this->createTenant();
        $intern = $this->createUser();
        $this->createMembership($tenant, $intern, MembershipRole::Intern);
        TenantContext::setCurrent($tenant);

        $report = app(UpsertDailyReportHandler::class)->handle(new UpsertDailyReport(
            user: $intern,
            reportDate: '2026-04-22',
            progressSummary: 'Avance normal.',
        ));

        $this->expectExceptionMessageMatches('/review your own/i');
        app(ReviewDailyReportHandler::class)->handle(new ReviewDailyReport($report->id, $intern));
    }

    public function test_review_por_lead_funciona(): void
    {
        $tenant = $this->createTenant();
        $intern = $this->createUser('i@tr.test');
        $lead = $this->createUser('l@tr.test');
        $this->createMembership($tenant, $intern, MembershipRole::Intern);
        $this->createMembership($tenant, $lead, MembershipRole::TeamLead);
        TenantContext::setCurrent($tenant);

        $report = app(UpsertDailyReportHandler::class)->handle(new UpsertDailyReport(
            user: $intern,
            reportDate: '2026-04-22',
            progressSummary: 'Avance del día.',
        ));

        $reviewed = app(ReviewDailyReportHandler::class)->handle(
            new ReviewDailyReport($report->id, $lead)
        );

        $this->assertSame(DailyReportStatus::Reviewed, $reviewed->status);
        $this->assertSame($lead->id, $reviewed->reviewed_by);
    }

    public function test_raise_y_resolve_blocker(): void
    {
        $tenant = $this->createTenant();
        $intern = $this->createUser();
        $lead = $this->createUser();
        $this->createMembership($tenant, $intern, MembershipRole::Intern);
        $this->createMembership($tenant, $lead, MembershipRole::TeamLead);
        TenantContext::setCurrent($tenant);

        $blocker = app(RaiseBlockerHandler::class)->handle(new RaiseBlocker(
            raiser: $intern,
            title: 'API del CMS no responde',
            severity: 'high',
            description: 'Esperando acceso a endpoint /auth',
        ));

        $this->assertSame(BlockerStatus::Open, $blocker->status);
        $this->assertSame($intern->id, $blocker->raised_by);

        $resolved = app(ResolveBlockerHandler::class)->handle(new ResolveBlocker(
            blockerId: $blocker->id,
            resolver: $lead,
            resolution: 'Se abrió acceso al endpoint',
        ));

        $this->assertSame(BlockerStatus::Resolved, $resolved->status);
        $this->assertNotNull($resolved->resolved_at);
        $this->assertSame($lead->id, $resolved->resolved_by);

        // Idempotente
        $again = app(ResolveBlockerHandler::class)->handle(new ResolveBlocker(
            blockerId: $blocker->id,
            resolver: $lead,
            resolution: 'Otra vez',
        ));
        $this->assertSame(BlockerStatus::Resolved, $again->status);
    }

    public function test_aislamiento_entre_tenants(): void
    {
        $tenantA = $this->createTenant(['slug' => 'tr-a']);
        $tenantB = $this->createTenant(['slug' => 'tr-b']);
        $iA = $this->createUser();
        $iB = $this->createUser();
        $this->createMembership($tenantA, $iA, MembershipRole::Intern);
        $this->createMembership($tenantB, $iB, MembershipRole::Intern);

        $this->asTenant($tenantA, fn () => app(UpsertDailyReportHandler::class)->handle(
            new UpsertDailyReport($iA, '2026-04-22', 'Report A')
        ));
        $this->asTenant($tenantB, fn () => app(UpsertDailyReportHandler::class)->handle(
            new UpsertDailyReport($iB, '2026-04-22', 'Report B')
        ));

        TenantContext::setCurrent($tenantA);
        $this->assertSame(1, DailyReport::count());
        $this->assertSame('Report A', DailyReport::first()->progress_summary);
    }
}
