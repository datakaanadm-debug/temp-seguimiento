<?php

declare(strict_types=1);

namespace App\Modules\People\Domain\Exceptions;

use DomainException;

final class MentorCapacityExceeded extends DomainException
{
    public static function for(string $mentorName, int $max): self
    {
        return new self("Mentor {$mentorName} already has {$max} active mentees (max capacity).");
    }
}
