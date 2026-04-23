<?php

declare(strict_types=1);

namespace App\Modules\Performance\Domain\Enums;

enum EvaluationKind: string
{
    case D30 = '30d';
    case D60 = '60d';
    case D90 = '90d';
    case AdHoc = 'adhoc';
    case Feedback360 = '360';
    case Onboarding = 'onboarding';
    case Offboarding = 'offboarding';

    public function label(): string
    {
        return match ($this) {
            self::D30 => 'Evaluación 30 días',
            self::D60 => 'Evaluación 60 días',
            self::D90 => 'Evaluación 90 días',
            self::AdHoc => 'Ad-hoc',
            self::Feedback360 => 'Feedback 360',
            self::Onboarding => 'Onboarding',
            self::Offboarding => 'Offboarding',
        };
    }
}
