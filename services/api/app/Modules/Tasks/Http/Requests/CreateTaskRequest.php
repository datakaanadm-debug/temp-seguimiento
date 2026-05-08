<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Requests;

use App\Modules\Tasks\Domain\Task;
use Illuminate\Foundation\Http\FormRequest;

final class CreateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Task::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'project_id' => ['required', 'uuid', 'exists:projects,id'],
            'list_id' => ['sometimes', 'nullable', 'uuid', 'exists:task_lists,id'],
            'parent_task_id' => ['sometimes', 'nullable', 'uuid', 'exists:tasks,id'],
            'key_result_id' => ['sometimes', 'nullable', 'uuid', 'exists:key_results,id'],
            'title' => ['required', 'string', 'min:1', 'max:300'],
            'description' => ['sometimes', 'nullable', 'string', 'max:50000'],
            'priority' => ['sometimes', 'string', 'in:urgent,high,normal,low'],
            'assignee_id' => ['sometimes', 'nullable', 'uuid', 'exists:users,id'],
            'reviewer_id' => ['sometimes', 'nullable', 'uuid', 'exists:users,id', 'different:assignee_id'],
            'due_at' => ['sometimes', 'nullable', 'date'],
            'estimated_minutes' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100000'],
            'tag_ids' => ['sometimes', 'array', 'max:20'],
            'tag_ids.*' => ['uuid', 'exists:tags,id'],
            'collaborator_ids' => ['sometimes', 'array', 'max:15'],
            'collaborator_ids.*' => ['uuid', 'exists:users,id'],
        ];
    }

    /**
     * Reglas de negocio:
     *  1. Un intern solo puede asignar tareas a sí mismo o a su(s) mentor(es)
     *     activo(s). Staff (admin/hr/team_lead/mentor) puede a cualquiera.
     *  2. El reviewer debe ser staff con autoridad (mentor/team_lead/hr/admin/
     *     supervisor) — un intern NO puede ser revisor de ninguna tarea, ni
     *     auto-asignarse como revisor.
     */
    public function withValidator(\Illuminate\Validation\Validator $validator): void
    {
        $validator->after(function ($v) {
            $actor = $this->user();
            $role = $actor?->primaryRole()?->value;
            $assigneeId = $this->input('assignee_id');
            if ($assigneeId && $role === 'intern' && $assigneeId !== $actor->id) {
                $isMentor = \DB::table('mentor_assignments')
                    ->where('intern_user_id', $actor->id)
                    ->where('mentor_user_id', $assigneeId)
                    ->where('status', 'active')
                    ->exists();
                if (!$isMentor) {
                    $v->errors()->add(
                        'assignee_id',
                        'Un practicante solo puede asignar tareas a sí mismo o a su mentor.',
                    );
                }
            }

            // Validación de reviewer (aplica a todos los roles).
            $reviewerId = $this->input('reviewer_id');
            if ($reviewerId) {
                $reviewerRole = \DB::table('memberships')
                    ->where('user_id', $reviewerId)
                    ->where('tenant_id', \App\Shared\Tenancy\TenantContext::currentId())
                    ->where('status', 'active')
                    ->value('role');

                $allowed = ['tenant_admin', 'hr', 'team_lead', 'mentor', 'supervisor'];
                if (!$reviewerRole || !in_array($reviewerRole, $allowed, true)) {
                    $v->errors()->add(
                        'reviewer_id',
                        'El revisor debe tener rol de mentor, líder de equipo, RRHH o admin.',
                    );
                }
            }
        });
    }
}
