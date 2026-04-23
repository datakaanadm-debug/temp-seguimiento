<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ResolveBlockerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'resolution' => ['required', 'string', 'min:3', 'max:2000'],
            'dismiss' => ['sometimes', 'boolean'],
        ];
    }
}
