<?php

declare(strict_types=1);

namespace App\Shared\Concerns;

use App\Modules\Identity\Domain\Tenant;
use App\Shared\Exceptions\TenantContextMissing;
use App\Shared\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Trait base para todo modelo de dominio. Garantiza dos cosas:
 *
 *   1. Queries filtradas automáticamente por el tenant del container.
 *   2. Creación rechazada si no hay tenant en el contexto (defensive programming).
 *
 * Aplica TenantScope como global scope. Si se necesita saltárselo (ops, comandos
 * interno), usar `Model::withoutGlobalScopes()` explícitamente (dejando trazabilidad).
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope());

        static::creating(function (Model $model) {
            if ($model->getAttribute('tenant_id')) {
                return;
            }

            if (app()->bound(Tenant::class)) {
                $model->setAttribute('tenant_id', app(Tenant::class)->id);
                return;
            }

            throw TenantContextMissing::forModel(get_class($model));
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
