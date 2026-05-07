<?php

declare(strict_types=1);

namespace App\Modules\Onboarding\Domain\Events;

use App\Shared\Events\DomainEvent;

/**
 * Se dispara cuando un practicante termina TODOS los items del checklist.
 *
 * Idempotencia: el OnboardingController solo lo dispara cuando el toggle
 * actual deja `done == total` Y el item recién marcado pasó de pendiente a hecho.
 * Si vuelves a abrir/cerrar items y caes 100% otra vez, se vuelve a disparar
 * (las acciones gamificadas son idempotentes — `awardBadge` no duplica).
 */
final class OnboardingChecklistCompleted extends DomainEvent
{
    public function __construct(
        public readonly string $internUserId,
        public readonly int $totalItems,
    ) {
        parent::__construct();
    }
}
