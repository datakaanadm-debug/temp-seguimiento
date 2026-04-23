<?php

declare(strict_types=1);

namespace App\Shared\Support;

use Illuminate\Support\Str;

/**
 * Helpers para UUID v7 (ordenables temporalmente).
 *
 * Laravel 11+ tiene HasUuids trait con uuidv4. Usamos uuidv7 para obtener ordenación
 * natural por tiempo de creación, crítico para indices compuestos (tenant_id, id)
 * que queremos recorrer en orden cronológico reverso sin necesitar created_at en el índice.
 */
final class Uuid
{
    public static function v7(): string
    {
        return (string) Str::uuid7();
    }

    public static function isValid(string $value): bool
    {
        return Str::isUuid($value);
    }
}
