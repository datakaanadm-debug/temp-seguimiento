<?php

declare(strict_types=1);

namespace App\Modules\People\Domain\Enums;

enum ProfileKind: string
{
    case Intern = 'intern';
    case Mentor = 'mentor';
    case Staff = 'staff';
    case HR = 'hr';
    case Admin = 'admin';

    public function label(): string
    {
        return match ($this) {
            self::Intern => 'Practicante',
            self::Mentor => 'Mentor',
            self::Staff => 'Personal',
            self::HR => 'RRHH',
            self::Admin => 'Administrador',
        };
    }
}
