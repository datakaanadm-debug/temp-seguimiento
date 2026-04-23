<?php

declare(strict_types=1);

namespace App\Modules\Reports\Domain\Enums;

enum ReportKind: string
{
    case University = 'university';
    case Executive = 'executive';
    case Team = 'team';
    case Intern = 'intern';
    case Custom = 'custom';

    public function label(): string
    {
        return match ($this) {
            self::University => 'Reporte Universitario',
            self::Executive => 'Reporte Ejecutivo',
            self::Team => 'Reporte de Equipo',
            self::Intern => 'Reporte de Practicante',
            self::Custom => 'Reporte Personalizado',
        };
    }

    public function defaultView(): string
    {
        return match ($this) {
            self::University => 'reports.university',
            self::Executive => 'reports.executive',
            self::Team => 'reports.team',
            self::Intern => 'reports.intern',
            self::Custom => 'reports.custom',
        };
    }
}
