# Módulo Organization

Estructura jerárquica del tenant: Department → Area → Team → TeamMembership.

## Responsabilidades

- Árbol organizacional del tenant.
- Asignación de lead a team.
- Inscripción/baja de usuarios en teams.
- Histórico de permanencia (joined_at / left_at) sin borrado destructivo.

## Estructura

```
app/Modules/Organization/
├── Domain/
│   ├── Enums/                TeamMembershipRole
│   ├── Events/               DepartmentCreated, TeamCreated, TeamMembershipChanged
│   ├── Department.php
│   ├── Area.php
│   ├── Team.php
│   └── TeamMembership.php
├── Application/Commands/     CreateDepartment, CreateArea, CreateTeam, AddTeamMember, RemoveTeamMember
└── Http/
    ├── Controllers/          DepartmentController, AreaController, TeamController
    ├── Requests/
    ├── Resources/            DepartmentResource, AreaResource, TeamResource, TeamMembershipResource
    ├── Policies/             DepartmentPolicy, AreaPolicy, TeamPolicy
    └── routes.php
```

## Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/v1/departments` | member | Árbol con areas |
| GET | `/api/v1/departments/{id}` | member | Con areas y teams |
| POST | `/api/v1/departments` | admin/HR | Crear department |
| PATCH | `/api/v1/departments/{id}` | admin/HR | Update |
| DELETE | `/api/v1/departments/{id}` | admin | Soft delete |
| GET/POST/PATCH/DELETE | `/api/v1/areas[/{id}]` | admin/HR | CRUD (con `?department_id=`) |
| GET | `/api/v1/teams` | member | Listado (con `?area_id=`) |
| POST | `/api/v1/teams` | admin/HR | Crear (lead opcional se auto-inscribe) |
| GET | `/api/v1/teams/{id}/members` | member | Miembros activos |
| POST | `/api/v1/teams/{id}/members` | admin/HR/lead del team | Añadir miembro |
| DELETE | `/api/v1/teams/{id}/members/{membershipId}` | admin/HR/lead | Baja (left_at) |

## Reglas de diseño

- **Team membership es histórica:** no se borra físicamente, se marca `left_at`. Esto permite reportes de "practicantes que pasaron por el equipo".
- **Unique parcial** `(team_id, user_id, role) WHERE left_at IS NULL` evita duplicados activos. Re-añadir un mismo user-role es idempotente.
- **Auto-inscripción del lead:** al crear un team con `lead_user_id`, se crea su membership con rol `lead`.
- **Scopes por role:** `manageMembers` permite admin, HR o el lead del propio team.

## Eventos emitidos

| Evento | Payload | Consumidores futuros |
|---|---|---|
| `DepartmentCreated` | Department, actor | Audit log |
| `TeamCreated` | Team, actor | Audit log, notificación a miembros |
| `TeamMembershipChanged` | membership, action('added'/'removed'), actor | Audit log, notificaciones |

## Tests

- `tests/Feature/OrganizationTest.php` — crear cascada, aislamiento multi-tenant, idempotencia de member add/remove.
