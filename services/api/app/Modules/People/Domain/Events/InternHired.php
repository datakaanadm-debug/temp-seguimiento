<?php

declare(strict_types=1);

namespace App\Modules\People\Domain\Events;

use App\Modules\Identity\Domain\User;
use App\Modules\People\Domain\Profile;
use App\Shared\Events\DomainEvent;

/**
 * Disparado cuando RRHH/líder/admin marca un practicante como "contratado"
 * — es decir, fue absorbido como empleado al terminar su programa.
 *
 * Se usa para:
 *  · Otorgar la badge `legacy-intern` (Gamification listener).
 *  · Futuro: notificar a su mentor/equipo, enviar email de bienvenida formal,
 *    archivar tareas del programa, etc.
 */
final class InternHired extends DomainEvent
{
    public function __construct(
        public readonly Profile $profile,
        public readonly ?User $actor,
    ) {
        parent::__construct();
    }
}
