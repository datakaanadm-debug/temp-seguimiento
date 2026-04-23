<?php

declare(strict_types=1);

namespace App\Modules\Identity\Domain\Exceptions;

use DomainException;

final class InvitationInvalid extends DomainException
{
    public static function expired(): self
    {
        return new self('The invitation has expired.');
    }

    public static function alreadyAccepted(): self
    {
        return new self('The invitation has already been accepted.');
    }

    public static function revoked(): self
    {
        return new self('The invitation has been revoked.');
    }

    public static function tokenMismatch(): self
    {
        return new self('The invitation token is invalid.');
    }

    public static function emailMismatch(): self
    {
        return new self('The invitation email does not match.');
    }
}
