<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Infrastructure\Listeners;

use App\Modules\Audit\Application\Services\ActivityLogger;
use App\Modules\Tasks\Domain\Events\ProjectCompleted;
use App\Modules\Tasks\Domain\Events\ProjectCreated;
use App\Modules\Tasks\Domain\Events\TaskAssigned;
use App\Modules\Tasks\Domain\Events\TaskCommented;
use App\Modules\Tasks\Domain\Events\TaskCreated;
use App\Modules\Tasks\Domain\Events\TaskStateChanged;
use App\Modules\Tasks\Domain\Events\TaskUpdated;
use App\Modules\Tasks\Domain\Project;
use App\Modules\Tasks\Domain\Task;

/**
 * Listener consolidado de actividad de tareas y proyectos. Cada method handle
 * recibe un event distinto y delega a ActivityLogger.
 */
final class AuditTaskActivity
{
    public function handle(
        TaskCreated|TaskUpdated|TaskStateChanged|TaskAssigned|TaskCommented|ProjectCreated|ProjectCompleted $event,
    ): void {
        match (true) {
            $event instanceof TaskCreated => $this->logTaskCreated($event),
            $event instanceof TaskStateChanged => $this->logTaskState($event),
            $event instanceof TaskUpdated => $this->logTaskUpdated($event),
            $event instanceof TaskAssigned => $this->logTaskAssigned($event),
            $event instanceof TaskCommented => $this->logTaskCommented($event),
            $event instanceof ProjectCreated => $this->logProjectCreated($event),
            $event instanceof ProjectCompleted => $this->logProjectCompleted($event),
        };
    }

    private function logTaskCreated(TaskCreated $e): void
    {
        ActivityLogger::record(
            tenantId: $e->task->tenant_id,
            logName: 'tasks',
            event: 'created',
            description: ($e->actor->name ?? 'Alguien') . ' creó la tarea "' . $e->task->title . '"',
            subjectType: Task::class,
            subjectId: $e->task->id,
            causerId: $e->actor->id,
            properties: [
                'title' => $e->task->title,
                'state' => $e->task->state->value,
                'priority' => $e->task->priority->value,
            ],
        );
    }

    private function logTaskState(TaskStateChanged $e): void
    {
        ActivityLogger::record(
            tenantId: $e->task->tenant_id,
            logName: 'tasks',
            event: 'state_changed',
            description: ($e->actor->name ?? 'Alguien') . ' movió "' . $e->task->title . '" de ' . $e->from->value . ' a ' . $e->to->value,
            subjectType: Task::class,
            subjectId: $e->task->id,
            causerId: $e->actor->id,
            properties: ['from' => $e->from->value, 'to' => $e->to->value, 'reason' => $e->reason],
        );
    }

    private function logTaskUpdated(TaskUpdated $e): void
    {
        ActivityLogger::record(
            tenantId: $e->task->tenant_id,
            logName: 'tasks',
            event: 'updated',
            description: ($e->actor->name ?? 'Alguien') . ' actualizó "' . $e->task->title . '"',
            subjectType: Task::class,
            subjectId: $e->task->id,
            causerId: $e->actor->id,
            properties: ['changes' => $e->changes],
        );
    }

    private function logTaskAssigned(TaskAssigned $e): void
    {
        // El event TaskAssigned se dispara cuando se añade un assignee o
        // colaborador. Causer = quien hizo la acción (actor), subject = task.
        $assigneeName = property_exists($e, 'assignee') && $e->assignee
            ? ($e->assignee->name ?? $e->assignee->email)
            : 'alguien';
        ActivityLogger::record(
            tenantId: $e->task->tenant_id,
            logName: 'tasks',
            event: 'assigned',
            description: ($e->actor->name ?? 'Alguien') . ' asignó a ' . $assigneeName . ' en la tarea "' . $e->task->title . '"',
            subjectType: Task::class,
            subjectId: $e->task->id,
            causerId: $e->actor->id ?? null,
            properties: [
                'assignee_id' => property_exists($e, 'assignee') ? $e->assignee?->id : null,
                'task_title' => $e->task->title,
            ],
        );
    }

    private function logTaskCommented(TaskCommented $e): void
    {
        $commenterName = property_exists($e, 'author') && $e->author
            ? ($e->author->name ?? $e->author->email)
            : 'Alguien';
        ActivityLogger::record(
            tenantId: $e->task->tenant_id,
            logName: 'tasks',
            event: 'commented',
            description: $commenterName . ' comentó en "' . $e->task->title . '"',
            subjectType: Task::class,
            subjectId: $e->task->id,
            causerId: property_exists($e, 'author') ? ($e->author->id ?? null) : null,
            properties: ['task_title' => $e->task->title],
        );
    }

    private function logProjectCreated(ProjectCreated $e): void
    {
        $actorName = property_exists($e, 'actor') && $e->actor ? ($e->actor->name ?? 'Alguien') : 'Alguien';
        ActivityLogger::record(
            tenantId: $e->project->tenant_id,
            logName: 'projects',
            event: 'created',
            description: $actorName . ' creó el proyecto "' . $e->project->name . '"',
            subjectType: Project::class,
            subjectId: $e->project->id,
            causerId: property_exists($e, 'actor') ? ($e->actor->id ?? null) : null,
            properties: ['name' => $e->project->name],
        );
    }

    private function logProjectCompleted(ProjectCompleted $e): void
    {
        ActivityLogger::record(
            tenantId: $e->project->tenant_id,
            logName: 'projects',
            event: 'completed',
            description: 'Proyecto "' . $e->project->name . '" marcado como completado',
            subjectType: Project::class,
            subjectId: $e->project->id,
            causerId: property_exists($e, 'actor') ? ($e->actor->id ?? null) : null,
            properties: ['name' => $e->project->name],
        );
    }
}
