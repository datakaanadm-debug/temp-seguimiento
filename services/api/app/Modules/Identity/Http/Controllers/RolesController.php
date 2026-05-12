<?php

declare(strict_types=1);

namespace App\Modules\Identity\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Expone los roles y permisos del sistema (Spatie + memberships) como read-only
 * para la UI de /configuracion/roles.
 */
class RolesController extends Controller
{
    private const ROLES = [
        [
            'id' => 'tenant_admin',
            'name' => 'Admin del workspace',
            'description' => 'Acceso total: configuración, usuarios, billing, integraciones.',
            'is_system' => true,
            'accent' => 'cobalt',
        ],
        [
            'id' => 'hr',
            'name' => 'Recursos Humanos',
            'description' => 'Supervisa programa, evalúa, configura automatizaciones.',
            'is_system' => true,
            'accent' => 'olive',
        ],
        [
            'id' => 'team_lead',
            'name' => 'Líder de equipo',
            'description' => 'Asigna tareas, revisa entregables, evalúa su equipo.',
            'is_system' => true,
            'accent' => 'terracotta',
        ],
        [
            'id' => 'mentor',
            'name' => 'Mentor',
            'description' => 'Notas 1:1 privadas, seguimiento de crecimiento.',
            'is_system' => true,
            'accent' => 'ochre',
        ],
        [
            'id' => 'intern',
            'name' => 'Practicante',
            'description' => 'Reporta su día, gestiona sus tareas, recibe feedback.',
            'is_system' => true,
            'accent' => null,
        ],
        [
            'id' => 'supervisor',
            'name' => 'Supervisor',
            'description' => 'Solo lectura. Dashboards y exportes.',
            'is_system' => true,
            'accent' => null,
        ],
    ];

    private const PERMISSIONS = [
        ['cap' => 'Invitar usuarios',          'roles' => ['tenant_admin', 'hr', 'team_lead', 'mentor']],
        ['cap' => 'Ver todos los practicantes', 'roles' => ['tenant_admin', 'hr']],
        ['cap' => 'Crear proyectos',           'roles' => ['tenant_admin', 'hr', 'team_lead', 'mentor']],
        ['cap' => 'Crear evaluaciones',        'roles' => ['tenant_admin', 'hr', 'team_lead', 'mentor']],
        ['cap' => 'Notas privadas de mentoría', 'roles' => ['mentor']],
        ['cap' => 'Crear automatizaciones',    'roles' => ['tenant_admin', 'hr']],
        ['cap' => 'Ver analítica global',      'roles' => ['tenant_admin', 'hr', 'team_lead', 'mentor']],
        ['cap' => 'Reporte universidad',       'roles' => ['tenant_admin', 'hr', 'intern']],
        ['cap' => 'Configurar billing',        'roles' => ['tenant_admin']],
        ['cap' => 'Ver audit log',             'roles' => ['tenant_admin']],
        ['cap' => 'Editar empresa',            'roles' => ['tenant_admin']],
    ];

    public function index(): JsonResponse
    {
        $tenantId = TenantContext::currentId();

        // Conteo real de miembros por role desde memberships
        $counts = DB::table('memberships')
            ->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->groupBy('role')
            ->select('role', DB::raw('COUNT(*) as c'))
            ->pluck('c', 'role');

        $roles = array_map(function (array $r) use ($counts) {
            $r['members'] = (int) ($counts[$r['id']] ?? 0);
            return $r;
        }, self::ROLES);

        return response()->json([
            'data' => [
                'roles' => $roles,
                'permissions' => self::PERMISSIONS,
            ],
        ]);
    }
}
