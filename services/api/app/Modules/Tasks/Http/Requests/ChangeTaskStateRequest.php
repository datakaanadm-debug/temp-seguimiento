<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ChangeTaskStateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'state' => ['required', 'string', 'in:BACKLOG,TO_DO,IN_PROGRESS,IN_REVIEW,DONE,BLOCKED,CANCELLED'],
            'reason' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'state.in' => 'Estado de tarea inválido.',
        ];
    }
}
