<?php

declare(strict_types=1);

namespace App\Modules\Organization\Domain\Enums;

enum TeamMembershipRole: string
{
    case Lead = 'lead';
    case Mentor = 'mentor';
    case Intern = 'intern';
    case Viewer = 'viewer';

    public function label(): string
    {
        return match ($this) {
            self::Lead => 'Líder',
            self::Mentor => 'Mentor',
            self::Intern => 'Practicante',
            self::Viewer => 'Observador',
        };
    }
}
