<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Performance\Application\Commands\AcknowledgeEvaluation;
use App\Modules\Performance\Application\Commands\AcknowledgeEvaluationHandler;
use App\Modules\Performance\Application\Commands\CreateScorecard;
use App\Modules\Performance\Application\Commands\CreateScorecardHandler;
use App\Modules\Performance\Application\Commands\SaveEvaluationResponses;
use App\Modules\Performance\Application\Commands\SaveEvaluationResponsesHandler;
use App\Modules\Performance\Application\Commands\ScheduleEvaluation;
use App\Modules\Performance\Application\Commands\ScheduleEvaluationHandler;
use App\Modules\Performance\Application\Commands\SubmitEvaluation;
use App\Modules\Performance\Application\Commands\SubmitEvaluationHandler;
use App\Modules\Performance\Application\Services\KpiComputation;
use App\Modules\Performance\Domain\Enums\EvaluationStatus;
use App\Modules\Performance\Domain\Exceptions\InvalidEvaluationTransition;
use App\Shared\Tenancy\TenantContext;
use Tests\TestCase;

class PerformanceTest extends TestCase
{
    public function test_scorecard_con_metrics_se_crea_en_cascada(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createUser();
        $this->createMembership($tenant, $admin, MembershipRole::TenantAdmin);
        TenantContext::setCurrent($tenant);

        $scorecard = app(CreateScorecardHandler::class)->handle(new CreateScorecard(
            actor: $admin,
            name: 'Intern 30d',
            metrics: [
                ['key' => 'tasks_on_time', 'label' => 'Tareas a tiempo', 'type' => 'auto',
                 'source' => 'tasks', 'target_value' => 85.0, 'unit' => 'percent', 'weight' => 1.5],
                ['key' => 'communication', 'label' => 'Comunicación', 'type' => 'likert',
                 'config' => ['scale' => 5], 'weight' => 1.0],
            ],
        ));

        $this->assertSame('Intern 30d', $scorecard->name);
        $this->assertCount(2, $scorecard->metrics);
    }

    public function test_fsm_evaluation_happy_path(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createUser();
        $intern = $this->createUser('i@perf.test');
        $lead = $this->createUser('l@perf.test');
        $this->createMembership($tenant, $admin, MembershipRole::TenantAdmin);
        $this->createMembership($tenant, $intern, MembershipRole::Intern);
        $this->createMembership($tenant, $lead, MembershipRole::TeamLead);
        TenantContext::setCurrent($tenant);

        $scorecard = app(CreateScorecardHandler::class)->handle(new CreateScorecard(
            actor: $admin,
            name: 'SC',
            metrics: [['key' => 'communication', 'label' => 'Com', 'type' => 'likert']],
        ));

        $eval = app(ScheduleEvaluationHandler::class)->handle(new ScheduleEvaluation(
            scorecardId: $scorecard->id,
            subjectUserId: $intern->id,
            kind: '30d',
            scheduledFor: now()->addWeek()->toDateString(),
            evaluatorUserId: $lead->id,
            actor: $admin,
        ));
        $this->assertSame(EvaluationStatus::Scheduled, $eval->status);

        $metric = $scorecard->metrics->first();
        $eval = app(SaveEvaluationResponsesHandler::class)->handle(new SaveEvaluationResponses(
            evaluationId: $eval->id,
            evaluator: $lead,
            responses: [$metric->id => ['value_numeric' => 4.0]],
            narrative: 'Buen progreso en general.',
            overallScore: 8.5,
        ));
        $this->assertSame(EvaluationStatus::InProgress, $eval->status);

        $eval = app(SubmitEvaluationHandler::class)->handle(new SubmitEvaluation($eval->id, $lead));
        $this->assertSame(EvaluationStatus::Submitted, $eval->status);

        $eval = app(AcknowledgeEvaluationHandler::class)->handle(new AcknowledgeEvaluation($eval->id, $intern));
        $this->assertSame(EvaluationStatus::Acknowledged, $eval->status);
        $this->assertNotNull($eval->acknowledged_at);
    }

    public function test_submit_rechaza_si_el_evaluator_es_el_subject(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createUser();
        $victim = $this->createUser();
        $this->createMembership($tenant, $admin, MembershipRole::TenantAdmin);
        $this->createMembership($tenant, $victim, MembershipRole::Intern);
        TenantContext::setCurrent($tenant);

        $sc = app(CreateScorecardHandler::class)->handle(new CreateScorecard(
            actor: $admin,
            name: 'SC',
            metrics: [['key' => 'k1', 'label' => 'k1', 'type' => 'manual']],
        ));

        $eval = app(ScheduleEvaluationHandler::class)->handle(new ScheduleEvaluation(
            scorecardId: $sc->id,
            subjectUserId: $victim->id,
            kind: 'adhoc',
            scheduledFor: now()->toDateString(),
            evaluatorUserId: null,
        ));

        // Victim intenta auto-submit (aún sin evaluator)
        $this->expectException(InvalidEvaluationTransition::class);
        app(SubmitEvaluationHandler::class)->handle(new SubmitEvaluation($eval->id, $victim));
    }

    public function test_acknowledge_solo_por_el_subject(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createUser();
        $intern = $this->createUser();
        $lead = $this->createUser();
        $this->createMembership($tenant, $admin, MembershipRole::TenantAdmin);
        $this->createMembership($tenant, $intern, MembershipRole::Intern);
        $this->createMembership($tenant, $lead, MembershipRole::TeamLead);
        TenantContext::setCurrent($tenant);

        $sc = app(CreateScorecardHandler::class)->handle(new CreateScorecard(
            actor: $admin, name: 'SC',
            metrics: [['key' => 'k', 'label' => 'k', 'type' => 'manual']],
        ));
        $eval = app(ScheduleEvaluationHandler::class)->handle(new ScheduleEvaluation(
            scorecardId: $sc->id, subjectUserId: $intern->id,
            kind: 'adhoc', scheduledFor: now()->toDateString(),
            evaluatorUserId: $lead->id,
        ));
        app(SaveEvaluationResponsesHandler::class)->handle(new SaveEvaluationResponses(
            evaluationId: $eval->id, evaluator: $lead,
            responses: [$sc->metrics->first()->id => ['value_text' => 'ok']],
        ));
        app(SubmitEvaluationHandler::class)->handle(new SubmitEvaluation($eval->id, $lead));

        // Lead intenta acknowledgement (que es del subject) → falla
        $this->expectException(InvalidEvaluationTransition::class);
        app(AcknowledgeEvaluationHandler::class)->handle(new AcknowledgeEvaluation($eval->id, $lead));
    }

    public function test_kpi_computation_devuelve_null_sin_samples(): void
    {
        $tenant = $this->createTenant();
        $intern = $this->createUser();
        $this->createMembership($tenant, $intern, MembershipRole::Intern);
        TenantContext::setCurrent($tenant);

        $result = app(KpiComputation::class)->compute(
            'tasks_on_time',
            $intern->id,
            now()->subMonth(),
            now(),
        );

        $this->assertNull($result['value']);
        $this->assertSame(0, $result['sample_size']);
    }
}
