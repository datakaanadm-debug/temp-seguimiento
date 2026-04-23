<?php

declare(strict_types=1);

namespace App\Shared\Exceptions;

use RuntimeException;

/**
 * Se lanza cuando un código que requiere contexto de tenant no lo tiene.
 *
 * Casos típicos:
 *   - Job async dispatch sin envolver en TenantContext::run
 *   - Comando Artisan que toca tablas con RLS sin set_config
 *   - Creación de modelo BelongsToTenant sin tenant bindeado
 *
 * NUNCA se debe capturar para continuar silenciosamente — siempre indica un bug real.
 */
final class TenantContextMissing extends RuntimeException
{
    public static function forOperation(string $operation): self
    {
        return new self("Tenant context missing for operation: {$operation}");
    }

    public static function forModel(string $class): self
    {
        return new self(
            "Cannot operate on model {$class} without tenant context. " .
            "Wrap in TenantContext::run() or ensure ResolveTenantMiddleware has been called."
        );
    }
}
