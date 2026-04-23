<?php

declare(strict_types=1);

namespace App\Shared\Tenancy;

use App\Modules\Identity\Domain\Tenant;
use App\Shared\Exceptions\TenantContextMissing;
use Closure;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Gestor central del contexto multi-tenant.
 *
 * Responsabilidades:
 *   1. Resolver y bindear el Tenant actual en el container.
 *   2. Escribir `app.tenant_id` en la sesión Postgres (RLS lo lee).
 *   3. Exponer `run()` para ejecutar código fuera de un request HTTP (jobs, consola).
 *   4. Asegurar reset al salir (clave con Octane workers y queue workers persistentes).
 *
 * @see docs/architecture/02-multi-tenancy.md
 */
final class TenantContext
{
    public static function setCurrent(Tenant $tenant): void
    {
        app()->instance(Tenant::class, $tenant);
        DB::statement("SELECT set_config('app.tenant_id', ?, false)", [$tenant->id]);
    }

    public static function setCurrentById(string $tenantId): void
    {
        $tenant = Tenant::query()->withoutGlobalScopes()->findOrFail($tenantId);
        self::setCurrent($tenant);
    }

    public static function current(): Tenant
    {
        if (!app()->bound(Tenant::class)) {
            throw TenantContextMissing::forOperation('TenantContext::current');
        }
        return app(Tenant::class);
    }

    public static function currentId(): string
    {
        return self::current()->id;
    }

    public static function has(): bool
    {
        return app()->bound(Tenant::class);
    }

    public static function clear(): void
    {
        app()->forgetInstance(Tenant::class);
        DB::statement("SELECT set_config('app.tenant_id', '', false)");
    }

    /**
     * Ejecuta $callback con el contexto del tenant dado. Garantiza limpieza al salir
     * incluso si lanza excepción. Uso típico: jobs y comandos Artisan.
     *
     * @template T
     * @param  Closure(Tenant):T  $callback
     * @return T
     */
    public static function run(string $tenantId, Closure $callback): mixed
    {
        $previous = app()->bound(Tenant::class) ? app(Tenant::class) : null;

        $tenant = Tenant::query()->withoutGlobalScopes()->findOrFail($tenantId);
        self::setCurrent($tenant);

        try {
            return $callback($tenant);
        } finally {
            if ($previous) {
                self::setCurrent($previous);
            } else {
                self::clear();
            }
        }
    }
}
