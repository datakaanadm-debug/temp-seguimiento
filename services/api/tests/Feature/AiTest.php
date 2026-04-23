<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Modules\AI\Application\Commands\DetectRiskInsights;
use App\Modules\AI\Application\Commands\DetectRiskInsightsHandler;
use App\Modules\AI\Application\Commands\SummarizeDailyReport;
use App\Modules\AI\Application\Commands\SummarizeDailyReportHandler;
use App\Modules\AI\Application\Contracts\LlmClient;
use App\Modules\AI\Application\Contracts\LlmRequest;
use App\Modules\AI\Application\Contracts\LlmResponse;
use App\Modules\AI\Application\Services\QuotaGuard;
use App\Modules\AI\Domain\AiInsight;
use App\Modules\AI\Domain\AiRequestLog;
use App\Modules\AI\Domain\AiSummary;
use App\Modules\AI\Domain\Enums\LlmModel;
use App\Modules\AI\Domain\Exceptions\AiQuotaExceeded;
use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Tracking\Application\Commands\UpsertDailyReport;
use App\Modules\Tracking\Application\Commands\UpsertDailyReportHandler;
use App\Shared\Tenancy\TenantContext;
use Tests\TestCase;

/**
 * Mock del LlmClient: inyectamos un fake que retorna contenido predecible sin
 * tocar la API real. Evita costos y latencia.
 */
class FakeLlmClient implements LlmClient
{
    public int $calls = 0;
    public string $fixedResponse = 'Resumen de prueba del avance.';

    public function call(LlmRequest $request): LlmResponse
    {
        $this->calls++;
        return new LlmResponse(
            model: $request->model,
            content: $this->fixedResponse,
            promptTokens: 120,
            completionTokens: 80,
            latencyMs: 42,
            costUsd: 0.0006,
            cacheHit: false,
        );
    }
}

class AiTest extends TestCase
{
    private FakeLlmClient $fakeClient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeClient = new FakeLlmClient();
        $this->app->instance(LlmClient::class, $this->fakeClient);
    }

    public function test_summarize_daily_report_persiste_summary_y_actualiza_referencia(): void
    {
        $tenant = $this->createTenant();
        $intern = $this->createUser();
        $this->createMembership($tenant, $intern, MembershipRole::Intern);
        TenantContext::setCurrent($tenant);

        $report = app(UpsertDailyReportHandler::class)->handle(new UpsertDailyReport(
            user: $intern,
            reportDate: '2026-04-22',
            progressSummary: 'Hoy trabajé en el diseño del hero y el wireframe del footer durante 3 horas.',
            submit: true,
        ));

        $summary = app(SummarizeDailyReportHandler::class)->handle(
            new SummarizeDailyReport($report->id)
        );

        $this->assertNotNull($summary);
        $this->assertInstanceOf(AiSummary::class, $summary);
        $this->assertSame('daily', $summary->kind->value);
        $this->assertSame(1, $this->fakeClient->calls);

        $report->refresh();
        $this->assertSame($summary->id, $report->ai_summary_id);

        // Log se persistió
        $this->assertSame(1, AiRequestLog::where('tenant_id', $tenant->id)->count());
    }

    public function test_summarize_no_re_genera_si_ya_existe(): void
    {
        $tenant = $this->createTenant();
        $intern = $this->createUser();
        $this->createMembership($tenant, $intern, MembershipRole::Intern);
        TenantContext::setCurrent($tenant);

        $report = app(UpsertDailyReportHandler::class)->handle(new UpsertDailyReport(
            user: $intern, reportDate: '2026-04-22',
            progressSummary: 'Avance suficiente para un resumen.',
        ));

        app(SummarizeDailyReportHandler::class)->handle(new SummarizeDailyReport($report->id));
        $callsBefore = $this->fakeClient->calls;

        app(SummarizeDailyReportHandler::class)->handle(new SummarizeDailyReport($report->id));

        // El segundo llamado no invoca al LLM
        $this->assertSame($callsBefore, $this->fakeClient->calls);
    }

    public function test_quota_guard_rechaza_si_tenant_tiene_ai_disabled(): void
    {
        $tenant = $this->createTenant([
            'settings' => ['ai_enabled' => false],
        ]);
        TenantContext::setCurrent($tenant);

        $this->expectException(AiQuotaExceeded::class);
        app(QuotaGuard::class)->ensureAllowed();
    }

    public function test_quota_guard_respeta_limite_del_plan(): void
    {
        // Plan starter: 100 calls/día
        $tenant = $this->createTenant(['plan' => 'starter']);
        TenantContext::setCurrent($tenant);

        // Simular 100 calls ya consumidas
        for ($i = 0; $i < 100; $i++) {
            AiRequestLog::create([
                'tenant_id' => $tenant->id,
                'status' => 'success',
                'cache_hit' => false,
                'created_at' => now(),
            ]);
        }

        // Cache puede tener valor obsoleto; invalidamos
        app(QuotaGuard::class)->invalidateCounter($tenant->id);

        $this->expectException(AiQuotaExceeded::class);
        app(QuotaGuard::class)->ensureAllowed();
    }

    public function test_detect_insights_con_data_insuficiente_no_llama_al_llm(): void
    {
        $tenant = $this->createTenant();
        $intern = $this->createUser();
        $this->createMembership($tenant, $intern, MembershipRole::Intern);
        TenantContext::setCurrent($tenant);

        $insights = app(DetectRiskInsightsHandler::class)->handle(
            new DetectRiskInsights($intern->id)
        );

        $this->assertSame([], $insights);
        $this->assertSame(0, $this->fakeClient->calls);
    }

    public function test_detect_insights_persiste_cuando_llm_devuelve_json_valido(): void
    {
        $tenant = $this->createTenant();
        $intern = $this->createUser();
        $this->createMembership($tenant, $intern, MembershipRole::Intern);
        TenantContext::setCurrent($tenant);

        // Crear signals mínimos para que pase el umbral
        \DB::table('daily_reports')->insert([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $tenant->id,
            'user_id' => $intern->id,
            'report_date' => now()->subDay(),
            'status' => 'submitted',
            'progress_summary' => 'avance',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->fakeClient->fixedResponse = json_encode([
            'insights' => [
                [
                    'kind' => 'risk_of_delay',
                    'severity' => 'warning',
                    'title' => 'Ritmo bajo detectado',
                    'description' => 'Solo 1 reporte en 14 días. Revisar con el practicante.',
                    'confidence' => 0.75,
                    'evidence' => ['reportes' => 1, 'ventana_dias' => 14],
                ],
            ],
        ]);

        $insights = app(DetectRiskInsightsHandler::class)->handle(
            new DetectRiskInsights($intern->id)
        );

        $this->assertCount(1, $insights);
        $this->assertSame('risk_of_delay', $insights[0]->kind->value);
        $this->assertSame(1, AiInsight::count());
    }

    public function test_detect_insights_ignora_confidence_bajo(): void
    {
        $tenant = $this->createTenant();
        $intern = $this->createUser();
        $this->createMembership($tenant, $intern, MembershipRole::Intern);
        TenantContext::setCurrent($tenant);

        // signal mínimo para pasar insufficient check
        \DB::table('daily_reports')->insert([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $tenant->id,
            'user_id' => $intern->id,
            'report_date' => now(),
            'status' => 'submitted',
            'progress_summary' => 'x',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->fakeClient->fixedResponse = json_encode([
            'insights' => [
                ['kind' => 'low_activity', 'severity' => 'info', 'title' => 't',
                 'description' => 'd', 'confidence' => 0.3],
            ],
        ]);

        $insights = app(DetectRiskInsightsHandler::class)->handle(
            new DetectRiskInsights($intern->id)
        );
        $this->assertCount(0, $insights);
    }
}
