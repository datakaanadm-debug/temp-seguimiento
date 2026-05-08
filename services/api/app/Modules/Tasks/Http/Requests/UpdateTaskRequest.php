<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'min:1', 'max:300'],
            'description' => ['sometimes', 'nullable', 'string', 'max:50000'],
            'priority' => ['sometimes', 'string', 'in:urgent,high,normal,low'],
            'assignee_id' => ['sometimes', 'nullable', 'uuid', 'exists:users,id'],
            'reviewer_id' => ['sometimes', 'nullable', 'uuid', 'exists:users,id'],
            'due_at' => ['sometimes', 'nullable', 'date'],
            'estimated_minutes' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100000'],
            'list_id' => ['sometimes', 'nullable', 'uuid', 'exists:task_lists,id'],
            'key_result_id' => ['sometimes', 'nullable', 'uuid', 'exists:key_results,id'],
            'position' => ['sometimes', 'integer', 'min:0'],
            'tag_ids' => ['sometimes', 'array', 'max:20'],
            'tag_ids.*' => ['uuid', 'exists:tags,id'],
            'collaborator_ids' => ['sometimes', 'array', 'max:15'],
            'collaborator_ids.*' => ['uuid', 'exists:users,id'],
        ];
    }

    /**
     * Mismas reglas de revisor que CreateTaskRequest: el reviewer_id solo
     * puede ser un usuario con autoridad (mentor+). Esto evita que un intern
     * actualice una tarea poniéndose a sí mismo como revisor desde el detalle.
     */
    public function withValidator(\Illuminate\Validation\Validator $validator): void
    {
        $validator->after(function ($v) {
            $reviewerId = $this->input('reviewer_id');
            if (!$reviewerId) return;

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
        });
    }
}
