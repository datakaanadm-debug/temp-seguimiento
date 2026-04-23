<?php

declare(strict_types=1);

namespace App\Modules\Reports\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CreateTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'kind' => ['required', 'string', 'in:university,executive,team,intern,custom'],
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'config' => ['required', 'array'],
            'layout' => ['sometimes', 'string', 'max:50'],
        ];
    }
}
