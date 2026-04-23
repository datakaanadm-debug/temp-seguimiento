<?php

declare(strict_types=1);

namespace App\Shared\Events;

use App\Shared\Support\Uuid;
use DateTimeImmutable;

/**
 * Base para eventos de dominio. Expone metadata estándar:
 *
 *   - $id: UUID único del evento (clave para idempotencia).
 *   - $occurredAt: cuándo ocurrió el evento según el emisor.
 *
 * Las subclases añaden su propio payload como constructor args readonly.
 */
abstract class DomainEvent
{
    public readonly string $id;
    public readonly DateTimeImmutable $occurredAt;

    public function __construct()
    {
        $this->id = Uuid::v7();
        $this->occurredAt = new DateTimeImmutable();
    }
}
