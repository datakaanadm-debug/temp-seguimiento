<?php

declare(strict_types=1);

namespace App\Modules\Performance\Domain\Enums;

/**
 * FSM de Evaluation:
 *
 *   SCHEDULED → IN_PROGRESS → SUBMITTED → ACKNOWLEDGED
 *        ↓          ↓             ↓             ↓
 *   CANCELLED   CANCELLED     DISPUTED  →  RESOLVED
 */
enum EvaluationStatus: string
{
    case Scheduled = 'SCHEDULED';
    case InProgress = 'IN_PROGRESS';
    case Submitted = 'SUBMITTED';
    case Acknowledged = 'ACKNOWLEDGED';
    case Disputed = 'DISPUTED';
    case Resolved = 'RESOLVED';
    case Cancelled = 'CANCELLED';

    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Scheduled    => [self::InProgress, self::Cancelled],
            self::InProgress   => [self::Submitted, self::Cancelled],
            self::Submitted    => [self::Acknowledged, self::Disputed],
            self::Acknowledged => [],   // terminal
            self::Disputed     => [self::Resolved],
            self::Resolved     => [],
            self::Cancelled    => [],
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return $target !== $this && in_array($target, $this->allowedTransitions(), true);
    }

    public function isFinal(): bool
    {
        return in_array($this, [self::Acknowledged, self::Resolved, self::Cancelled], true);
    }

    public function isWritable(): bool
    {
        return in_array($this, [self::Scheduled, self::InProgress], true);
    }
}
