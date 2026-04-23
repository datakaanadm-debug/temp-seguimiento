<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Shared\Tenancy\TenantContext;
use App\Shared\Tenancy\TenantResolver;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware que resuelve y fija el Tenant actual para toda request HTTP.
 *
 * Orden de resolución:
 *   1. Subdomain del Host header  (caso normal: acme.interna.app)
 *   2. Header X-Tenant-Slug        (integraciones server-to-server)
 *
 * Si no se puede resolver, corta con 400.
 *
 * Importante: este middleware DEBE correr en CADA request con Octane, porque los workers
 * persisten entre requests y podrían heredar el tenant del request anterior.
 *
 * @see docs/architecture/02-multi-tenancy.md
 */
final class ResolveTenant
{
    public function __construct(
        private readonly TenantResolver $resolver,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        // Rutas que no requieren tenant (ej. health, tenant registration global)
        if ($this->isTenantlessRoute($request)) {
            TenantContext::clear();
            return $next($request);
        }

        $slug = $request->header('X-Tenant-Slug')
            ?: $this->resolver->extractSubdomain(
                host: $request->getHost(),
                rootDomain: config('app.root_domain', 'interna.app'),
            );

        if (!$slug) {
            abort(400, 'Tenant subdomain is required');
        }

        $tenant = $this->resolver->resolveBySlug($slug);

        if (!$tenant) {
            abort(404, 'Tenant not found, suspended, or inactive');
        }

        TenantContext::setCurrent($tenant);

        // Atributos de OTel (cuando el SDK esté instalado)
        if (function_exists('opentelemetry_current_span')) {
            $span = \opentelemetry_current_span();
            $span?->setAttribute('tenant.id', $tenant->id);
            $span?->setAttribute('tenant.slug', $tenant->slug);
        }

        return $next($request);
    }

    private function isTenantlessRoute(Request $request): bool
    {
        $tenantlessPaths = [
            'up',                    // Laravel health check
            'api/v1/health',
            'api/v1/tenants/register',  // registro de tenant nuevo
            'api/v1/webhooks/stripe',   // webhook global de billing
        ];

        foreach ($tenantlessPaths as $path) {
            if ($request->is($path)) {
                return true;
            }
        }
        return false;
    }
}
