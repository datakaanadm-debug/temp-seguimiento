<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Reports\Application\Commands\RequestReport;
use App\Modules\Reports\Application\Commands\RequestReportHandler;
use App\Modules\Reports\Application\Jobs\GenerateReportJob;
use App\Modules\Reports\Application\Services\UniversityReportBuilder;
use App\Modules\Reports\Domain\Enums\ReportKind;
use App\Modules\Reports\Domain\Enums\RunStatus;
use App\Modules\Reports\Domain\ReportRun;
use App\Modules\Reports\Domain\ReportTemplate;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ReportsTest extends TestCase
{
    public function test_request_report_crea_run_queued_y_dispatcha_job(): void
    {
        Queue::fake();

        $tenant = $this->createTenant();
        $admin = $this->createUser();
        $intern = $this->createUser();
        $this->createMembership($tenant, $admin, MembershipRole::TenantAdmin);
        $this->createMembership($tenant, $intern, MembershipRole::Intern);
        TenantContext::setCurrent($tenant);

        $template = ReportTemplate::create([
            'kind' => ReportKind::University->value,
            'name' => 'Universidad default',
            'config' => ['include_tasks' => true],
            'layout' => 'default',
            'is_system' => false,
        ]);

        $run = app(RequestReportHandler::class)->handle(new RequestReport(
            templateId: $template->id,
            requester: $admin,
            subjectType: 'user',
            subjectId: $intern->id,
            periodStart: '2026-01-01',
            periodEnd: '2026-04-22',
        ));

        $this->assertSame(RunStatus::Queued, $run->status);
        $this->assertNotNull($run->expires_at);
        Queue::assertPushed(GenerateReportJob::class, fn ($job) => $job->runId === $run->id);
    }

    public function test_builder_university_produce_data_shape(): void
    {
        $tenant = $this->createTenant();
        $intern = $this->createUser('intern@r.test');
        $this->createMembership($tenant, $intern, MembershipRole::Intern);
        TenantContext::setCurrent($tenant);

        $data = app(UniversityReportBuilder::class)->build(
            internUserId: $intern->id,
            periodStart: new \DateTimeImmutable('2026-01-01'),
            periodEnd: new \DateTimeImmutable('2026-04-22'),
        );

        $this->assertArrayHasKey('tenant', $data);
        $this->assertArrayHasKey('intern', $data);
        $this->assertArrayHasKey('kpis', $data);
        $this->assertArrayHasKey('tasks_on_time', $data['kpis']);
        $this->assertSame($intern->name, $data['intern']['name']);
        $this->assertSame($tenant->name, $data['tenant']['name']);
    }

    public function test_report_run_aislado_entre_tenants(): void
    {
        $tenantA = $this->createTenant(['slug' => 'rpt-a']);
        $tenantB = $this->createTenant(['slug' => 'rpt-b']);
        $adminA = $this->createUser();
        $adminB = $this->createUser();
        $this->createMembership($tenantA, $adminA, MembershipRole::TenantAdmin);
        $this->createMembership($tenantB, $adminB, MembershipRole::TenantAdmin);

        $this->asTenant($tenantA, function () use ($adminA) {
            $t = ReportTemplate::create([
                'kind' => 'university', 'name' => 'T A',
                'config' => [], 'layout' => 'default', 'is_system' => false,
            ]);
            ReportRun::create([
                'template_id' => $t->id, 'requested_by' => $adminA->id,
                'status' => RunStatus::Queued->value,
            ]);
        });
        $this->asTenant($tenantB, function () use ($adminB) {
            $t = ReportTemplate::create([
                'kind' => 'university', 'name' => 'T B',
                'config' => [], 'layout' => 'default', 'is_system' => false,
            ]);
            ReportRun::create([
                'template_id' => $t->id, 'requested_by' => $adminB->id,
                'status' => RunStatus::Queued->value,
            ]);
        });

        TenantContext::setCurrent($tenantA);
        $this->assertSame(1, ReportRun::count());
        $this->assertSame(1, ReportTemplate::count());
    }
}
