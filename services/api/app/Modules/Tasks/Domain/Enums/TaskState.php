<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Domain\Enums;

/**
 * FSM de Task. Ver docs de producto sección 10.1 y docs/architecture/08-erd.md.
 *
 * Transiciones válidas codificadas aquí, NO dispersas en policies.
 * Las policies deciden QUIÉN puede disparar cada transición.
 */
enum TaskState: string
{
    case Backlog = 'BACKLOG';
    case ToDo = 'TO_DO';
    case InProgress = 'IN_PROGRESS';
    case InReview = 'IN_REVIEW';
    case Done = 'DONE';
    case Blocked = 'BLOCKED';
    case Cancelled = 'CANCELLED';

    /**
     * @return list<self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Backlog    => [self::ToDo, self::Cancelled, self::Blocked],
            self::ToDo       => [self::InProgress, self::Backlog, self::Cancelled, self::Blocked],
            self::InProgress => [self::InReview, self::ToDo, self::Blocked, self::Cancelled, self::Done],
            self::InReview   => [self::Done, self::InProgress, self::Blocked, self::Cancelled],
            self::Done       => [self::InProgress],  // reabrir si hay revert
            self::Blocked    => [self::Backlog, self::ToDo, self::InProgress, self::InReview, self::Cancelled],
            self::Cancelled  => [self::Backlog],     // restaurar
        };
    }

    public function canTransitionTo(self $target): bool
    {
        if ($target === $this) {
            return false;
        }
        return in_array($target, $this->allowedTransitions(), true);
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::Done, self::Cancelled], true);
    }

    public function isActive(): bool
    {
        return !$this->isTerminal();
    }

    public function isPending(): bool
    {
        return in_array($this, [self::Backlog, self::ToDo], true);
    }

    public function label(): string
    {
        return match ($this) {
            self::Backlog => 'Backlog',
            self::ToDo => 'Por hacer',
            self::InProgress => 'En curso',
            self::InReview => 'Revisión',
            self::Done => 'Hecho',
            self::Blocked => 'Bloqueado',
            self::Cancelled => 'Cancelado',
        };
    }

    /**
     * Categoría base para analytics (siempre cae en uno de los 3).
     */
    public function category(): string
    {
        return match ($this) {
            self::Backlog, self::ToDo => 'todo',
            self::InProgress, self::InReview, self::Blocked => 'in_progress',
            self::Done => 'done',
            self::Cancelled => 'cancelled',
        };
    }
}
