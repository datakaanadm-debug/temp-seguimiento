<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Domain\Exceptions;

use DomainException;

final class TimerAlreadyRunning extends DomainException
{
    public static function forUser(): self
    {
        return new self("User already has a running timer. Stop it before starting a new one.");
    }
}
