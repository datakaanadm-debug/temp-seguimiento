<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Domain\Events;

use App\Modules\Notifications\Domain\Enums\NotificationCategory;
use App\Shared\Events\DomainEvent;

/**
 * Evento interno del módulo — cuando un channel dispatch a un user con éxito.
 * Útil para métricas y para invalidación de cache del contador unread.
 */
final class NotificationDispatched extends DomainEvent
{
    public function __construct(
        public readonly string $userId,
        public readonly string $tenantId,
        public readonly NotificationCategory $category,
        public readonly string $channel,
    ) {
        parent::__construct();
    }
}
