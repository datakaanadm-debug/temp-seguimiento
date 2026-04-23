<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AddCommentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'min:1', 'max:10000'],
            'parent_comment_id' => ['sometimes', 'nullable', 'uuid', 'exists:comments,id'],
        ];
    }
}
