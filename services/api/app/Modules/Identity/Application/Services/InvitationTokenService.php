<?php

declare(strict_types=1);

namespace App\Modules\Identity\Application\Services;

use Illuminate\Support\Str;

/**
 * Genera y verifica tokens de invitación.
 *
 * Formato: 64 caracteres aleatorios URL-safe. Se persiste solo el SHA-256.
 * El token en claro solo existe durante el request de creación y se envía por email.
 */
final class InvitationTokenService
{
    /**
     * @return array{plain: string, hash: string}
     */
    public function generate(): array
    {
        $plain = Str::random(64);
        return [
            'plain' => $plain,
            'hash' => $this->hash($plain),
        ];
    }

    public function hash(string $token): string
    {
        return hash('sha256', $token);
    }

    public function verify(string $plainToken, string $storedHash): bool
    {
        return hash_equals($storedHash, $this->hash($plainToken));
    }
}
