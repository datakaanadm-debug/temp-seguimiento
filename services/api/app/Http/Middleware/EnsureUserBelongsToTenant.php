<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Shared\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tras el auth de Sanctum, verificar que el user autenticado pertenece al tenant
 * resuelto por la request. Previene el caso "cookie válida en otro tenant".
 */
final class EnsureUserBelongsToTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            abort(401);
        }

        if (!TenantContext::has()) {
            abort(400, 'Tenant context required');
        }

        $tenantId = TenantContext::currentId();

        // El user debe tener una membership activa en el tenant actual
        $belongs = $user->memberships()
            ->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->exists();

        if (!$belongs) {
            abort(403, 'User does not belong to this tenant');
        }

        return $next($request);
    }
}
