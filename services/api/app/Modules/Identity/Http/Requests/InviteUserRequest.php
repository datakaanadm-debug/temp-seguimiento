<?php

declare(strict_types=1);

namespace App\Modules\Identity\Http\Requests;

use App\Modules\Identity\Domain\Invitation;
use Illuminate\Foundation\Http\FormRequest;

final class InviteUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Invitation::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255'],
            'role' => ['required', 'string', 'in:tenant_admin,hr,team_lead,mentor,intern,supervisor,viewer'],
            'team_id' => ['sometimes', 'nullable', 'uuid', 'exists:teams,id'],
            'mentor_id' => ['sometimes', 'nullable', 'uuid', 'exists:users,id'],
            'expires_in_hours' => ['sometimes', 'integer', 'min:1', 'max:720'], // max 30 días
        ];
    }
}
