<?php

declare(strict_types=1);

namespace App\Modules\Identity\Domain\Exceptions;

use DomainException;

final class TenantSlugTaken extends DomainException
{
    public static function for(string $slug): self
    {
        return new self("Tenant slug '{$slug}' is already in use.");
    }
}
