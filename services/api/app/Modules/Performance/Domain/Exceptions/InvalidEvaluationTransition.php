<?php

declare(strict_types=1);

namespace App\Modules\Performance\Domain\Exceptions;

use App\Modules\Performance\Domain\Enums\EvaluationStatus;
use DomainException;

final class InvalidEvaluationTransition extends DomainException
{
    public static function between(EvaluationStatus $from, EvaluationStatus $to): self
    {
        return new self("Evaluation transition {$from->value} → {$to->value} is not allowed.");
    }

    public static function subjectCannotSign(): self
    {
        return new self("The subject cannot sign their own evaluation.");
    }

    public static function onlySubjectAcknowledges(): self
    {
        return new self("Only the subject can acknowledge the evaluation.");
    }

    public static function onlySubjectDisputes(): self
    {
        return new self("Only the subject can dispute their evaluation.");
    }

    public static function evaluatorAlreadyStarted(): self
    {
        return new self("Cannot reassign evaluator once the evaluation has been submitted.");
    }
}
