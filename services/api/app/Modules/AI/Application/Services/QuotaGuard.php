<?php

declare(strict_types=1);

namespace App\Modules\AI\Application\Services;

use App\Modules\AI\Domain\AiRequestLog;
use App\Modules\AI\Domain\Exceptions\AiQuotaExceeded;
use App\Modules\Identity\Domain\Tenant;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\Cache;

/**
 * Valida que el tenant actual pueda hacer una llamada IA:
 *   - Feature flag `settings.ai_enabled`.
 *   - Cuota diaria según `TenantPlan::aiCallsPerDay()`.
 *
 * La cuota se cuenta contra ai_request_log con status != 'cached' (los cached son gratis).
 * Cache del contador por 60s para no hacer COUNT en cada llamada.
 */
final class QuotaGuard
{
    public function ensureAllowed(?Tenant $tenant = null): void
    {
        $tenant = $tenant ?? TenantContext::current();

        if (!$tenant->isAiEnabled()) {
            throw AiQuotaExceeded::disabled();
        }

        $limit = $tenant->plan->aiCallsPerDay();
        if ($limit === null) {
            return; // unlimited (enterprise)
        }

        $used = $this->usedToday($tenant->id);
        if ($used >= $limit) {
            throw AiQuotaExceeded::forTenant($tenant->id, $limit);
        }
    }

    public function usedToday(string $tenantId): int
    {
        return (int) Cache::remember(
            "ai:usage:{$tenantId}:" . now()->toDateString(),
            now()->addSeconds(60),
            fn () => AiRequestLog::query()
                ->where('tenant_id', $tenantId)
                ->whereIn('status', ['success', 'error'])  // cached y rate_limited no cuentan
                ->whereDate('created_at', now()->toDateString())
                ->count()
        );
    }

    public function invalidateCounter(string $tenantId): void
    {
        Cache::forget("ai:usage:{$tenantId}:" . now()->toDateString());
    }
}
