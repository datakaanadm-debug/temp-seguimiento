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
            'title' => ['required', 'string', 'min:1', 'max:300'],
            'description' => ['sometimes', 'nullable', 'string', 'max:50000'],
            'priority' => ['sometimes', 'string', 'in:urgent,high,normal,low'],
            'assignee_id' => ['sometimes', 'nullable', 'uuid', 'exists:users,id'],
            'reviewer_id' => ['sometimes', 'nullable', 'uuid', 'exists:users,id', 'different:assignee_id'],
            'due_at' => ['sometimes', 'nullable', 'date'],
            'estimated_minutes' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100000'],
            'tag_ids' => ['sometimes', 'array', 'max:20'],
            'tag_ids.*' => ['uuid', 'exists:tags,id'],
        ];
    }
}
