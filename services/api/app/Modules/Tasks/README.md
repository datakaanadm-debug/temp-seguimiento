# Módulo Tasks

Gestión de actividades estilo ClickUp/Linear: proyectos, listas Kanban, tareas con FSM, comentarios polimórficos, attachments en R2 y time tracking.

## Responsabilidades

- **Projects**: contenedor de trabajo dentro de un `Team`. Tiene listas, tareas, start/end dates, status.
- **TaskLists**: columnas Kanban. Reordenables. Wip limit opcional.
- **Tasks**: unidad de trabajo. FSM estricta (7 estados), prioridad, assignee primary + watchers vía pivot.
- **Comments** (polimórfico): menciones por `@{uuid}` parseadas y validadas contra memberships del tenant.
- **Attachments** (polimórfico): flujo pre-signed URL para upload directo a R2. El backend nunca toca los bytes del archivo.
- **Time entries**: timer (start/stop con guard contra concurrentes) + entrada manual.
- **Tags**: etiquetas libres por tenant.

## Estructura

```
app/Modules/Tasks/
├── Domain/
│   ├── Enums/                TaskState (con FSM), TaskPriority, ProjectStatus, TimeEntrySource, AssigneeRole
│   ├── Events/               ProjectCreated, TaskCreated, TaskUpdated, TaskStateChanged,
│   │                         TaskAssigned, TaskCommented, TaskBlocked, TimeEntryStopped
│   ├── Exceptions/           InvalidTaskTransition, TimerAlreadyRunning
│   ├── Project.php
│   ├── TaskList.php
│   ├── Task.php              denso (FK a project, list, parent, assignee, reviewer; pivot multi-asignado)
│   ├── Comment.php           morphTo commentable
│   ├── Attachment.php        morphTo attachable
│   ├── TimeEntry.php
│   └── Tag.php
├── Application/
│   ├── Services/
│   │   └── TaskStateMachine.php    FSM + autorización por rol en una sola clase
│   └── Commands/                   CreateProject, CreateTask, UpdateTask, ChangeTaskState,
│                                    AddComment, StartTimer, StopTimer, AddManualTimeEntry,
│                                    PresignAttachmentUpload, RegisterAttachment, DeleteAttachment
├── Infrastructure/
│   └── Listeners/
│       ├── AuditTaskActivity.php            sync → activity_log
│       └── UpdateTaskActualMinutes.php      async → incrementa task.actual_minutes
└── Http/
    ├── Controllers/          Project, TaskList, Task, Comment, Attachment, TimeEntry, Tag
    ├── Requests/
    ├── Resources/
    ├── Policies/             ProjectPolicy, TaskPolicy
    └── routes.php
```

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST/PATCH/DELETE | `/projects` | CRUD proyectos |
| GET | `/projects/{p}/lists` | Listas del proyecto |
| POST | `/projects/{p}/lists` | Crear lista |
| POST | `/projects/{p}/lists/reorder` | `{ list_ids: [...] }` re-ordena |
| PATCH/DELETE | `/lists/{l}` | Editar/borrar lista (falla si tiene tareas) |
| GET | `/tasks?project_id=&state=&assignee_id=&mine=&overdue=&q=&sort=&dir=` | Listado con filtros |
| POST | `/tasks` | Crear tarea (entra en primera lista por default) |
| GET/PATCH/DELETE | `/tasks/{t}` | Detalle / update / soft delete |
| POST | `/tasks/{t}/state` | Cambiar estado (FSM valida + role check) |
| GET/POST | `/tasks/{t}/comments` | Listar / crear comentario (extrae menciones) |
| PATCH/DELETE | `/comments/{c}` | Editar (solo author) / borrar (author o admin) |
| GET | `/tasks/{t}/attachments` | Lista con download URL pre-firmada 15 min |
| POST | `/tasks/{t}/attachments/presign` | Devuelve `{upload_url, stored_key, headers}` — cliente PUT directo a R2 |
| POST | `/tasks/{t}/attachments` | Registra en DB tras upload (verifica existencia en R2) |
| DELETE | `/attachments/{a}` | Soft delete + hard delete en R2 |
| POST | `/tasks/{t}/time-entries/start` | Start timer (falla si ya hay uno activo del user) |
| POST | `/time-entries/{e}/stop` | Stop (solo el dueño; idempotente) |
| POST | `/tasks/{t}/time-entries/manual` | Entrada manual con started_at/ended_at |
| GET | `/time-entries/running` | Timer activo del user actual |
| GET/POST/DELETE | `/tags` | Gestión de etiquetas del tenant |

## FSM (TaskState)

```
BACKLOG → TO_DO ↔ IN_PROGRESS → IN_REVIEW → DONE
   ↑       ↑          ↓             ↓         ↓
   └───────┴── BLOCKED ────────────────────────┤  (puede ir a cualquiera al salir)
           └── CANCELLED ← cualquier estado ───┘
```

Transiciones válidas declaradas en `TaskState::allowedTransitions()`. Reglas de **quién** puede disparar cada una en `TaskStateMachine::assertRoleCanTransitionTo`:

- `DONE` no puede ser auto-aprobada (assignee ≠ aprobador). Excepción: `tenant_admin`.
- `BLOCKED` exige `reason` no vacío.
- `CANCELLED` solo `team_lead` y `tenant_admin`.
- `ToDo/InProgress/InReview` admiten al asignado o lead/mentor.
- `TenantAdmin` y `HR` bypasan las reglas de rol (mantienen las de FSM).
- Project con `status` ≠ `active` bloquea cualquier transición.

## Attachments: flujo pre-signed URL

```
1. Cliente → POST /tasks/{t}/attachments/presign
   body: { original_name, content_type, size_bytes }

   Backend valida MIME allowlist + size ≤ 50MB, genera key
   `tenants/{tid}/attachments/task/{taskId}/{uuid}-{slug}.ext`
   devuelve { upload_url, stored_key, headers, max_bytes }

2. Cliente → PUT {upload_url}
   headers: Content-Type: ...
   body: <bytes del archivo>

3. Cliente → POST /tasks/{t}/attachments
   body: { stored_key, original_name, mime_type, size_bytes, checksum_sha256? }

   Backend verifica:
   - Key pertenece al tenant actual (prefijo tenants/{tid}/)
   - Archivo existe en R2
   Crea registro en `attachments`
```

Ventajas: el backend nunca procesa los bytes (sin límite de memoria de PHP), TTL corto minimiza riesgo de replay.

## Eventos emitidos

| Evento | Listeners MVP |
|---|---|
| `ProjectCreated` | (futuros: warmup cache, welcome) |
| `TaskCreated` | AuditTaskActivity |
| `TaskUpdated` | AuditTaskActivity |
| `TaskStateChanged` | AuditTaskActivity · (fase 2: broadcast a Kanban, notifications al assignee) |
| `TaskAssigned` | (fase 2: notification al nuevo assignee) |
| `TaskCommented` | (fase 2: notification a mentioned) |
| `TaskBlocked` | (fase 2: notification al lead + AI insight candidate) |
| `TimeEntryStopped` | UpdateTaskActualMinutes (async, increment atomic) |

## Observaciones de diseño

- **`assignee_id` directo en `tasks`** para el flujo del 90% de casos. Tabla pivote `task_assignees` soporta watchers/reviewers múltiples cuando se active.
- **`position` INT con hueco de 1** por insert al final de lista. Re-ordenar vía `POST /projects/{p}/lists/reorder` es suficiente para MVP. Fase 2: fractional positions (strings tipo Jira lex) si la concurrencia lo exige.
- **Menciones por UUID** en MVP (`@{uuid}`); el frontend traduce `@name` → `@{uuid}` antes de enviar. Fase 2: lookup server-side por username.
- **R2 pre-signed URL de descarga** se genera en cada `GET /attachments`. En listas largas (>50 attachments) esto puede ser lento; considerar endpoint `POST /attachments/{id}/download-url` on-demand.
- **Timer atomic increment** de `actual_minutes` vía `DB::raw('actual_minutes + N')` en listener async. Evita race con múltiples stops simultáneos.

## Tests

- `tests/Unit/TaskStateMachineTest.php` — FSM: transiciones válidas, inválidas, categoría, terminal.
- `tests/Feature/TasksTest.php` — flujo completo: crear project con lists default, self-approval rechazado, lead aprueba DONE, blocked requiere razón, blocked_reason se limpia, timer suma minutos, timer concurrente rechazado, menciones filtran a users del tenant, aislamiento multi-tenant.

## TODO fase 2

- [ ] Broadcasting Reverb: canales `tenant.{t}.project.{p}` con TaskCreated/StateChanged
- [ ] Notifications en TaskAssigned / TaskCommented / TaskBlocked
- [ ] Task dependencies (tabla `task_dependencies`)
- [ ] Search con índice GIN ya creado — endpoint `/tasks/search?q=`
- [ ] Bulk operations (mover N tasks entre listas)
- [ ] Subtasks recursivas con carga eager del árbol
- [ ] Mentions por `@username` (lookup server-side)
