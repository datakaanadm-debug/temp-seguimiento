<?php

declare(strict_types=1);

namespace App\Modules\Identity\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AcceptInvitationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // endpoint público — valida contra el token hash
    }

    public function rules(): array
    {
        return [
            'token' => ['required', 'string', 'size:64'],
            'email' => ['required', 'email', 'max:255'],
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'password' => ['required', 'string', 'min:12', 'max:255'],
            'timezone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'locale' => ['sometimes', 'nullable', 'string', 'max:10'],
        ];
    }
}
