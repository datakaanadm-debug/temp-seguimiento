<?php

declare(strict_types=1);

namespace App\Modules\Organization\Http\Requests;

use App\Modules\Organization\Domain\Department;
use Illuminate\Foundation\Http\FormRequest;

final class CreateDepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Department::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'slug' => ['required', 'string', 'min:2', 'max:60', 'regex:/^[a-z0-9][a-z0-9-]*[a-z0-9]$/'],
            'position' => ['sometimes', 'integer', 'min:0', 'max:9999'],
            'metadata' => ['sometimes', 'array'],
        ];
    }
}
