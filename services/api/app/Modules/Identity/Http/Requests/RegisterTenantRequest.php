<?php

declare(strict_types=1);

namespace App\Modules\Identity\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class RegisterTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // endpoint público; rate limit se aplica via throttle middleware
    }

    public function rules(): array
    {
        return [
            'slug' => [
                'required', 'string', 'min:3', 'max:48',
                'regex:/^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/',
                'unique:tenants,slug',
                'not_in:www,api,app,admin,auth,status,support,billing,docs',
            ],
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'admin_email' => ['required', 'email:rfc,dns', 'max:255'],
            'admin_name' => ['required', 'string', 'min:2', 'max:150'],
            'admin_password' => ['required', 'string', 'min:12', 'max:255'],
            'plan' => ['sometimes', 'string', 'in:starter,growth,business,enterprise'],
            'data_residency' => ['sometimes', 'string', 'in:latam,us,eu'],
        ];
    }

    public function messages(): array
    {
        return [
            'slug.regex' => 'El subdominio solo puede contener letras minúsculas, números y guiones (sin empezar/terminar con guion).',
            'admin_password.min' => 'La contraseña debe tener al menos 12 caracteres.',
        ];
    }
}
