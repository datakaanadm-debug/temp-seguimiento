# Módulo People

Perfiles extendidos, datos específicos de practicante/mentor, asignaciones mentor↔practicante.

## Responsabilidades

- Profile 1:1 con User, contextualizado al tenant (un user en 2 tenants tiene 2 profiles).
- Datos académicos del practicante (`intern_data`): universidad, carrera, horas.
- Capacidades del mentor (`mentor_data`): expertise, max_mentees, disponibilidad.
- Asignaciones mentor↔practicante con histórico.
- Cifrado PII app-level: `phone`, `national_id` (AES via Laravel `encrypted` cast).
- Visibilidad granular en Resource según rol (PII oculto para practicantes externos).

## Estructura

```
app/Modules/People/
├── Domain/
│   ├── Enums/                ProfileKind, AssignmentStatus
│   ├── Events/               ProfileUpdated, InternAssignedToMentor, InternUnassignedFromMentor
│   ├── Exceptions/           MentorCapacityExceeded
│   ├── Profile.php           1:1 con User (cifra phone, national_id)
│   ├── InternData.php        datos académicos
│   ├── MentorData.php        expertise + capacidad
│   └── MentorAssignment.php  asignación con unique parcial en DB
├── Application/Commands/     UpdateProfile, UpsertInternData, AssignMentor, UnassignMentor
└── Http/
    ├── Controllers/          ProfileController, MentorAssignmentController
    ├── Requests/
    ├── Resources/            ProfileResource (visibilidad PII), InternDataResource, MentorDataResource, MentorAssignmentResource
    ├── Policies/             ProfilePolicy, MentorAssignmentPolicy
    └── routes.php
```

## Endpoints

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| GET | `/api/v1/profiles` | miembro | Listado, `?kind=intern/mentor/staff`, `?q=búsqueda` |
| GET | `/api/v1/profiles/me` | miembro | El propio |
| GET | `/api/v1/profiles/{id}` | miembro (staff o self) | Detalle |
| PATCH | `/api/v1/profiles/{id}` | self o admin/HR | Actualizar (cambio de `kind` requiere admin/HR) |
| PUT | `/api/v1/profiles/{id}/intern-data` | self o admin/HR | Upsert datos de practicante |
| GET | `/api/v1/mentor-assignments` | staff/mentor | Listado con filtros |
| POST | `/api/v1/mentor-assignments` | admin/HR/team_lead | Asignar mentor (sustituye activo si hay) |
| DELETE | `/api/v1/mentor-assignments/{id}` | admin/HR/team_lead | Finalizar asignación |

## Reglas clave

### Visibilidad de PII en `ProfileResource`

| Campo | Self | Staff (admin, HR, lead, mentor) | Resto |
|---|---|---|---|
| `email`, `name`, `bio`, `skills` | ✓ | ✓ | ✓ |
| `phone`, `birth_date`, `emergency_contact` | ✓ | ✓ | ✗ |
| `national_id` | ✓ | admin/HR solo | ✗ |

### Asignación de mentor

1. Se valida que el mentor no supere `max_mentees` activos.
2. Si el practicante ya tiene un mentor activo, se termina (`status=ended`, `ended_at=now`) en la misma transacción.
3. Se crea el nuevo assignment con `status=active`.
4. El unique partial index `(tenant_id, intern_user_id) WHERE status='active'` es la última defensa.

### PII cifrado

- `phone`, `national_id`, `two_factor_secret`, `two_factor_recovery_codes` usan cast `encrypted` de Laravel (AES-256-GCM con APP_KEY).
- `birth_date` no se cifra actualmente; si un cliente Enterprise lo exige por LGPD estricto, activamos cast `encrypted:date`.
- Tests verifican que la DB raw no contiene los valores en claro.

## Eventos emitidos

| Evento | Payload | Consumidores futuros |
|---|---|---|
| `ProfileUpdated` | Profile, actor, changes(diff) | Audit log, cache invalidation |
| `InternAssignedToMentor` | MentorAssignment, actor | Notifications (bienvenida al mentor + intern), onboarding checklist |
| `InternUnassignedFromMentor` | MentorAssignment, actor | Audit log, notifications |

## Tests

- `tests/Feature/PeopleTest.php` — cifrado PII round-trip, upsert intern data, sustitución de mentor, capacidad máxima, idempotencia de unassign.
