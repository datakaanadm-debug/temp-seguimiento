<?php

declare(strict_types=1);

namespace App\Modules\Identity\Domain\Enums;

/**
 * Roles del sistema. Roles custom por tenant se modelan en `roles` table (Spatie).
 */
enum MembershipRole: string
{
    case TenantAdmin = 'tenant_admin';
    case HR = 'hr';
    case TeamLead = 'team_lead';
    case Mentor = 'mentor';
    case Intern = 'intern';
    case Supervisor = 'supervisor';
    case Viewer = 'viewer';

    public function label(): string
    {
        return match ($this) {
            self::TenantAdmin => 'Administrador',
            self::HR => 'RRHH',
            self::TeamLead => 'Líder de equipo',
            self::Mentor => 'Mentor',
            self::Intern => 'Practicante',
            self::Supervisor => 'Supervisor',
            self::Viewer => 'Solo lectura',
        };
    }

    public function isStaff(): bool
    {
        return !in_array($this, [self::Intern, self::Viewer], true);
    }

    public function canInvite(): bool
    {
        // Mentor incluido porque en orgs chicas (DKN-style) el mentor es
        // también líder de su equipo y necesita poder invitar miembros
        // nuevos sin pasar por HR.
        return in_array($this, [self::TenantAdmin, self::HR, self::TeamLead, self::Mentor], true);
    }

    public function canManageTenant(): bool
    {
        return $this === self::TenantAdmin;
    }
}
