<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Requests;

use App\Modules\Tasks\Domain\Project;
use Illuminate\Foundation\Http\FormRequest;

final class CreateProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Project::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'team_id' => ['required', 'uuid', 'exists:teams,id'],
            'name' => ['required', 'string', 'min:2', 'max:200'],
            'slug' => ['required', 'string', 'min:2', 'max:100', 'regex:/^[a-z0-9][a-z0-9-]*[a-z0-9]$/'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'color' => ['sometimes', 'nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'start_date' => ['sometimes', 'nullable', 'date'],
            'end_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:start_date'],
            'with_default_lists' => ['sometimes', 'boolean'],
        ];
    }
}
