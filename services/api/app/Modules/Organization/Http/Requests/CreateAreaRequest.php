<?php

declare(strict_types=1);

namespace App\Modules\Organization\Http\Requests;

use App\Modules\Organization\Domain\Area;
use Illuminate\Foundation\Http\FormRequest;

final class CreateAreaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Area::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'department_id' => ['required', 'uuid', 'exists:departments,id'],
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'slug' => ['required', 'string', 'min:2', 'max:60', 'regex:/^[a-z0-9][a-z0-9-]*[a-z0-9]$/'],
            'position' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ];
    }
}
