<?php

declare(strict_types=1);

namespace App\Modules\Organization\Http\Requests;

use App\Modules\Organization\Domain\Team;
use Illuminate\Foundation\Http\FormRequest;

final class CreateTeamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Team::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'area_id' => ['required', 'uuid', 'exists:areas,id'],
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'slug' => ['required', 'string', 'min:2', 'max:60', 'regex:/^[a-z0-9][a-z0-9-]*[a-z0-9]$/'],
            'lead_user_id' => ['sometimes', 'nullable', 'uuid', 'exists:users,id'],
            'color' => ['sometimes', 'nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'metadata' => ['sometimes', 'array'],
        ];
    }
}
