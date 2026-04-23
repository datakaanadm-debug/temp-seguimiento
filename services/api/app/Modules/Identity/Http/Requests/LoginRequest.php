<?php

declare(strict_types=1);

namespace App\Modules\Identity\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

final class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:1', 'max:255'],
            'remember' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Rate limit por email + IP. 5/min/email, 20/min/IP.
     */
    public function ensureIsNotRateLimited(): void
    {
        $emailKey = 'login:email:' . strtolower($this->input('email'));
        $ipKey = 'login:ip:' . $this->ip();

        if (RateLimiter::tooManyAttempts($emailKey, 5) || RateLimiter::tooManyAttempts($ipKey, 20)) {
            $seconds = max(
                RateLimiter::availableIn($emailKey),
                RateLimiter::availableIn($ipKey),
            );
            throw ValidationException::withMessages([
                'email' => "Demasiados intentos. Intenta de nuevo en {$seconds} segundos.",
            ])->status(429);
        }
    }

    public function hitRateLimit(): void
    {
        RateLimiter::hit('login:email:' . strtolower($this->input('email')), 900);
        RateLimiter::hit('login:ip:' . $this->ip(), 900);
    }

    public function clearRateLimit(): void
    {
        RateLimiter::clear('login:email:' . strtolower($this->input('email')));
    }
}
