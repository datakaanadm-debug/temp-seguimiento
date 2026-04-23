<?php

declare(strict_types=1);

namespace App\Modules\AI\Domain\Exceptions;

use DomainException;

final class AiQuotaExceeded extends DomainException
{
    public static function forTenant(string $tenantId, int $limit): self
    {
        return new self("Tenant {$tenantId} exceeded AI daily quota ({$limit} calls).");
    }

    public static function disabled(): self
    {
        return new self("AI is disabled for this tenant.");
    }
}
