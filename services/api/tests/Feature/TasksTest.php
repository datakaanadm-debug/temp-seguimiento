<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Organization\Application\Commands\CreateArea;
use App\Modules\Organization\Application\Commands\CreateAreaHandler;
use App\Modules\Organization\Application\Commands\CreateDepartment;
use App\Modules\Organization\Application\Commands\CreateDepartmentHandler;
use App\Modules\Organization\Application\Commands\CreateTeam;
use App\Modules\Organization\Application\Commands\CreateTeamHandler;
use App\Modules\Tasks\Application\Commands\AddComment;
use App\Modules\Tasks\Application\Commands\AddCommentHandler;
use App\Modules\Tasks\Application\Commands\ChangeTaskState;
use App\Modules\Tasks\Application\Commands\ChangeTaskStateHandler;
use App\Modules\Tasks\Application\Commands\CreateProject;
use App\Modules\Tasks\Application\Commands\CreateProjectHandler;
use App\Modules\Tasks\Application\Commands\CreateTask;
use App\Modules\Tasks\Application\Commands\CreateTaskHandler;
use App\Modules\Tasks\Application\Commands\StartTimer;
use App\Modules\Tasks\Application\Commands\StartTimerHandler;
use App\Modules\Tasks\Application\Commands\StopTimer;
use App\Modules\Tasks\Application\Commands\StopTimerHandler;
use App\Modules\Tasks\Domain\Enums\TaskState;
use App\Modules\Tasks\Domain\Exceptions\InvalidTaskTransition;
use App\Modules\Tasks\Domain\Exceptions\TimerAlreadyRunning;
use App\Modules\Tasks\Domain\Task;
use App\Shared\Tenancy\TenantContext;
use Carbon\Carbon;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class TasksTest extends TestCase
{
    private function bootstrapTenant(): array
    {
        $tenant = $this->createTenant();
        $admin = $this->createUser();
        $lead = $this->createUser('lead@tasks.test');
        $intern = $this->createUser('intern@tasks.test');
        $mentor = $this->createUser('mentor@tasks.test');
        $this->createMembership($tenant, $admin, MembershipRole::TenantAdmin);
        $this->createMembership($tenant, $lead, MembershipRole::TeamLead);
        $this->createMembership($tenant, $intern, MembershipRole::Intern);
        $this->createMembership($tenant, $mentor, MembershipRole::Mentor);

        TenantContext::setCurrent($tenant);
        $dep = app(CreateDepartmentHandler::class)->handle(new CreateDepartment('Tech', 'tech', $admin));
        $area = app(CreateAreaHandler::class)->handle(new CreateArea($dep->id, 'Prod', 'prod', $admin));
        $team = app(CreateTeamHandler::class)->handle(new CreateTeam($area->id, 'Design', 'design', $admin, $lead->id));

        return compact('tenant', 'admin', 'lead', 'intern', 'mentor', 'team');
    }

    public function test_create_project_genera_lists_default(): void
    {
        ['admin' => $admin, 'team' => $team] = $this->bootstrapTenant();

        $project = app(CreateProjectHandler::class)->handle(new CreateProject(
            teamId: $team->id,
            name: 'Landing v2',
            slug: 'landing-v2',
            actor: $admin,
        ));

        $this->assertSame(5, $project->lists()->count());
        $names = $project->lists()->orderBy('position')->pluck('name')->all();
        $this->assertSame(['Backlog', 'To Do', 'En curso', 'Revisión', 'Hecho'], $names);
    }

    public function test_create_task_asigna_lista_default_y_position(): void
    {
        ['admin' => $admin, 'team' => $team] = $this->bootstrapTenant();
        $project = app(CreateProjectHandler::class)->handle(new CreateProject($team->id, 'P', 'p', $admin));

        $t1 = app(CreateTaskHandler::class)->handle(new CreateTask(
            projectId: $project->id,
            title: 'T1',
            actor: $admin,
        ));
        $t2 = app(CreateTaskHandler::class)->handle(new CreateTask(
            projectId: $project->id,
            title: 'T2',
            actor: $admin,
        ));

        $this->assertNotNull($t1->list_id);
        $this->assertSame($t1->list_id, $t2->list_id); // misma (primera) lista
        $this->assertSame(0, $t1->position);
        $this->assertSame(1, $t2->position);
    }

    public function test_fsm_rechaza_transicion_invalida(): void
    {
        ['admin' => $admin, 'team' => $team, 'intern' => $intern] = $this->bootstrapTenant();
        $project = app(CreateProjectHandler::class)->handle(new CreateProject($team->id, 'P', 'p', $admin));
        $task = app(CreateTaskHandler::class)->handle(new CreateTask(
            projectId: $project->id,
            title: 'T',
            actor: $admin,
            assigneeId: $intern->id,
        ));
        // Estado TO_DO: no puede saltar directo a DONE
        $this->expectException(InvalidTaskTransition::class);
        app(ChangeTaskStateHandler::class)->handle(
            new ChangeTaskState($task->id, TaskState::Done->value, $admin)
        );
    }

    public function test_fsm_no_self_approval_done(): void
    {
        ['admin' => $admin, 'team' => $team, 'intern' => $intern, 'lead' => $lead] = $this->bootstrapTenant();
        $project = app(CreateProjectHandler::class)->handle(new CreateProject($team->id, 'P', 'p', $admin));
        $task = app(CreateTaskHandler::class)->handle(new CreateTask(
            projectId: $project->id,
            title: 'T',
            actor: $admin,
            assigneeId: $intern->id,
        ));

        // Intern → InProgress → InReview
        app(ChangeTaskStateHandler::class)->handle(new ChangeTaskState($task->id, TaskState::InProgress->value, $intern));
        app(ChangeTaskStateHandler::class)->handle(new ChangeTaskState($task->id, TaskState::InReview->value, $intern));

        // Intern NO puede marcar DONE su propia tarea
        $this->expectException(InvalidTaskTransition::class);
        app(ChangeTaskStateHandler::class)->handle(new ChangeTaskState($task->id, TaskState::Done->value, $intern));
    }

    public function test_fsm_lead_puede_aprobar_done(): void
    {
        ['admin' => $admin, 'team' => $team, 'intern' => $intern, 'lead' => $lead] = $this->bootstrapTenant();
        $project = app(CreateProjectHandler::class)->handle(new CreateProject($team->id, 'P', 'p', $admin));
        $task = app(CreateTaskHandler::class)->handle(new CreateTask(
            projectId: $project->id,
            title: 'T',
            actor: $admin,
            assigneeId: $intern->id,
        ));

        app(ChangeTaskStateHandler::class)->handle(new ChangeTaskState($task->id, TaskState::InProgress->value, $intern));
        app(ChangeTaskStateHandler::class)->handle(new ChangeTaskState($task->id, TaskState::InReview->value, $intern));

        $task = app(ChangeTaskStateHandler::class)->handle(new ChangeTaskState($task->id, TaskState::Done->value, $lead));
        $this->assertSame(TaskState::Done, $task->state);
        $this->assertNotNull($task->completed_at);
    }

    public function test_fsm_blocked_requiere_razon(): void
    {
        ['admin' => $admin, 'team' => $team, 'intern' => $intern] = $this->bootstrapTenant();
        $project = app(CreateProjectHandler::class)->handle(new CreateProject($team->id, 'P', 'p', $admin));
        $task = app(CreateTaskHandler::class)->handle(new CreateTask(
            projectId: $project->id,
            title: 'T',
            actor: $admin,
            assigneeId: $intern->id,
        ));

        $this->expectException(InvalidTaskTransition::class);
        app(ChangeTaskStateHandler::class)->handle(
            new ChangeTaskState($task->id, TaskState::Blocked->value, $intern, reason: null)
        );
    }

    public function test_blocked_reason_se_persiste_y_se_limpia_al_salir(): void
    {
        ['admin' => $admin, 'team' => $team, 'intern' => $intern] = $this->bootstrapTenant();
        $project = app(CreateProjectHandler::class)->handle(new CreateProject($team->id, 'P', 'p', $admin));
        $task = app(CreateTaskHandler::class)->handle(new CreateTask(
            projectId: $project->id,
            title: 'T',
            actor: $admin,
            assigneeId: $intern->id,
        ));

        app(ChangeTaskStateHandler::class)->handle(
            new ChangeTaskState($task->id, TaskState::Blocked->value, $intern, reason: 'API down')
        );
        $this->assertSame('API down', Task::find($task->id)->blocked_reason);

        // Sacar de BLOCKED: razón se limpia
        app(ChangeTaskStateHandler::class)->handle(
            new ChangeTaskState($task->id, TaskState::ToDo->value, $intern)
        );
        $this->assertNull(Task::find($task->id)->blocked_reason);
    }

    public function test_timer_start_y_stop_suma_minutos(): void
    {
        ['admin' => $admin, 'team' => $team, 'intern' => $intern] = $this->bootstrapTenant();
        $project = app(CreateProjectHandler::class)->handle(new CreateProject($team->id, 'P', 'p', $admin));
        $task = app(CreateTaskHandler::class)->handle(new CreateTask(
            projectId: $project->id,
            title: 'T',
            actor: $admin,
            assigneeId: $intern->id,
        ));

        Carbon::setTestNow('2026-04-22 10:00:00');
        $entry = app(StartTimerHandler::class)->handle(new StartTimer($task->id, $intern));

        Carbon::setTestNow('2026-04-22 11:30:00');
        $stopped = app(StopTimerHandler::class)->handle(new StopTimer($entry->id, $intern));

        $this->assertSame(90, $stopped->duration_minutes);
        Carbon::setTestNow();
    }

    public function test_timer_rechaza_segundo_running_para_mismo_user(): void
    {
        ['admin' => $admin, 'team' => $team, 'intern' => $intern] = $this->bootstrapTenant();
        $project = app(CreateProjectHandler::class)->handle(new CreateProject($team->id, 'P', 'p', $admin));
        $t1 = app(CreateTaskHandler::class)->handle(new CreateTask($project->id, 'T1', $admin));
        $t2 = app(CreateTaskHandler::class)->handle(new CreateTask($project->id, 'T2', $admin));

        app(StartTimerHandler::class)->handle(new StartTimer($t1->id, $intern));

        $this->expectException(TimerAlreadyRunning::class);
        app(StartTimerHandler::class)->handle(new StartTimer($t2->id, $intern));
    }

    public function test_comment_extrae_menciones_del_tenant(): void
    {
        ['admin' => $admin, 'team' => $team, 'intern' => $intern, 'mentor' => $mentor] = $this->bootstrapTenant();
        $project = app(CreateProjectHandler::class)->handle(new CreateProject($team->id, 'P', 'p', $admin));
        $task = app(CreateTaskHandler::class)->handle(new CreateTask($project->id, 'T', $admin));

        $comment = app(AddCommentHandler::class)->handle(new AddComment(
            taskId: $task->id,
            author: $admin,
            body: "Hola @{$intern->id} y también @{$mentor->id}, revisen esto.",
        ));

        $this->assertCount(2, $comment->mentions);
        $this->assertContains($intern->id, $comment->mentions);
        $this->assertContains($mentor->id, $comment->mentions);
    }

    public function test_task_aislada_por_tenant(): void
    {
        $tenantA = $this->createTenant(['slug' => 'tasks-a']);
        $tenantB = $this->createTenant(['slug' => 'tasks-b']);
        $adminA = $this->createUser('a@a.test');
        $adminB = $this->createUser('b@b.test');
        $this->createMembership($tenantA, $adminA, MembershipRole::TenantAdmin);
        $this->createMembership($tenantB, $adminB, MembershipRole::TenantAdmin);

        $this->asTenant($tenantA, function () use ($adminA) {
            $dep = app(CreateDepartmentHandler::class)->handle(new CreateDepartment('D', 'd', $adminA));
            $area = app(CreateAreaHandler::class)->handle(new CreateArea($dep->id, 'A', 'a', $adminA));
            $team = app(CreateTeamHandler::class)->handle(new CreateTeam($area->id, 'T', 't', $adminA));
            $project = app(CreateProjectHandler::class)->handle(new CreateProject($team->id, 'P', 'p', $adminA));
            app(CreateTaskHandler::class)->handle(new CreateTask($project->id, 'Task A', $adminA));
        });
        $this->asTenant($tenantB, function () use ($adminB) {
            $dep = app(CreateDepartmentHandler::class)->handle(new CreateDepartment('D', 'd', $adminB));
            $area = app(CreateAreaHandler::class)->handle(new CreateArea($dep->id, 'A', 'a', $adminB));
            $team = app(CreateTeamHandler::class)->handle(new CreateTeam($area->id, 'T', 't', $adminB));
            $project = app(CreateProjectHandler::class)->handle(new CreateProject($team->id, 'P', 'p', $adminB));
            app(CreateTaskHandler::class)->handle(new CreateTask($project->id, 'Task B', $adminB));
        });

        TenantContext::setCurrent($tenantA);
        $this->assertSame(1, Task::count());
        $this->assertSame('Task A', Task::first()->title);

        TenantContext::setCurrent($tenantB);
        $this->assertSame(1, Task::count());
        $this->assertSame('Task B', Task::first()->title);
    }
}
