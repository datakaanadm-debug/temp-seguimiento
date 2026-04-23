<?php

declare(strict_types=1);

namespace App\Shared\Tenancy;

use App\Modules\Identity\Domain\Tenant;
use Illuminate\Support\Facades\Cache;

/**
 * Resuelve un Tenant desde un identificador de request (subdomain o slug explícito).
 *
 * Siempre cachea con TTL corto para no martillar Postgres en cada request.
 */
final class TenantResolver
{
    private const SLUG_RESERVED = ['www', 'api', 'app', 'admin', 'auth', 'status'];
    private const CACHE_TTL_SECONDS = 300; // 5 min

    public function resolveBySlug(string $slug): ?Tenant
    {
        $slug = strtolower(trim($slug));

        if ($slug === '' || in_array($slug, self::SLUG_RESERVED, true)) {
            return null;
        }

        return Cache::remember(
            key: "tenant:slug:{$slug}",
            ttl: self::CACHE_TTL_SECONDS,
            callback: fn () => Tenant::query()
                ->withoutGlobalScopes()
                ->where('slug', $slug)
                ->whereIn('status', ['active', 'trialing'])
                ->first()
        );
    }

    public function extractSubdomain(string $host, string $rootDomain): ?string
    {
        $host = strtolower(trim($host));
        $rootDomain = strtolower(trim($rootDomain));

        // Normalizar puertos (localhost:8000 → localhost)
        $host = explode(':', $host)[0];

        if ($host === $rootDomain || str_ends_with($host, '.' . $rootDomain) === false) {
            return null;
        }

        $sub = substr($host, 0, -strlen('.' . $rootDomain));
        return $sub !== '' ? $sub : null;
    }

    public function forget(string $slug): void
    {
        Cache::forget("tenant:slug:{$slug}");
    }
}
