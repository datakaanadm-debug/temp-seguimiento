<?php

declare(strict_types=1);

namespace App\Modules\Organization\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AddTeamMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Se valida en el controlador contra $team (necesita el Team cargado)
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'user_id' => ['required', 'uuid', 'exists:users,id'],
            'role' => ['required', 'string', 'in:lead,mentor,intern,viewer'],
        ];
    }
}
