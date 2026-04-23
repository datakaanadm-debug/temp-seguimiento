<?php

declare(strict_types=1);

namespace App\Shared\Cache;

use App\Shared\Tenancy\TenantContext;
use Closure;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;

/**
 * Cache scoped por tenant con prefijo `t:{tenant_id}:`.
 *
 * Usa lock para prevenir cache stampede en payloads caros de regenerar.
 *
 * @see docs/architecture/06-caching.md
 */
final class TenantCache
{
    /**
     * Get-or-set con lock para prevenir stampede.
     */
    public static function remember(string $key, int $ttlSeconds, Closure $callback): mixed
    {
        $fullKey = self::prefix($key);
        $lockKey = "lock:{$fullKey}";

        $cached = Cache::get($fullKey);
        if ($cached !== null) {
            return $cached;
        }

        return Cache::lock($lockKey, 10)->block(5, function () use ($fullKey, $ttlSeconds, $callback) {
            // Double-check dentro del lock
            $cached = Cache::get($fullKey);
            if ($cached !== null) {
                return $cached;
            }

            $value = $callback();
            Cache::put($fullKey, $value, $ttlSeconds);
            return $value;
        });
    }

    public static function put(string $key, mixed $value, int $ttlSeconds): void
    {
        Cache::put(self::prefix($key), $value, $ttlSeconds);
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return Cache::get(self::prefix($key), $default);
    }

    public static function forget(string $key): void
    {
        Cache::forget(self::prefix($key));
    }

    /**
     * Borra múltiples keys por prefijo fragmento. Usar en listener async,
     * no en hot path (SCAN puede ser lento con muchas keys).
     */
    public static function forgetByPrefix(string $prefixFragment): void
    {
        $scanPrefix = self::prefix($prefixFragment);
        $conn = Redis::connection('cache');
        $cursor = '0';

        do {
            [$cursor, $keys] = $conn->scan($cursor, ['match' => "{$scanPrefix}*", 'count' => 100]);
            if (!empty($keys)) {
                $conn->del($keys);
            }
        } while ($cursor !== '0' && $cursor !== 0);
    }

    private static function prefix(string $key): string
    {
        $tenantId = TenantContext::has() ? TenantContext::currentId() : 'global';
        return "t:{$tenantId}:{$key}";
    }
}
