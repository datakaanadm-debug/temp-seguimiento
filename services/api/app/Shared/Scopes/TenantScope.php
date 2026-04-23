<?php

declare(strict_types=1);

namespace App\Shared\Scopes;

use App\Modules\Identity\Domain\Tenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Global scope que filtra queries por el tenant actual bindeado en el container.
 *
 * Funciona en paralelo con Row Level Security de Postgres (defense in depth).
 * Si el container no tiene tenant, el scope no aplica filtro extra — RLS lo bloquea
 * igualmente via current_setting('app.tenant_id').
 */
final class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if (app()->bound(Tenant::class)) {
            $builder->where(
                $model->qualifyColumn('tenant_id'),
                app(Tenant::class)->id
            );
        }
    }
}
