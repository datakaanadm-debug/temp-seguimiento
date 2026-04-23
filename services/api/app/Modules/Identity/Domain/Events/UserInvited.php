<?php

declare(strict_types=1);

namespace App\Modules\Identity\Domain\Events;

use App\Modules\Identity\Domain\Invitation;
use App\Modules\Identity\Domain\User;
use App\Shared\Events\DomainEvent;

/**
 * Se emite al crear una invitation (no al aceptarla).
 * Payload incluye el token en claro para que el listener pueda formar el link del email.
 * Ese token SOLO existe en memoria durante este evento; en DB solo queda su hash.
 */
final class UserInvited extends DomainEvent
{
    public function __construct(
        public readonly Invitation $invitation,
        public readonly User $actor,
        public readonly string $plainToken,
    ) {
        parent::__construct();
    }
}
