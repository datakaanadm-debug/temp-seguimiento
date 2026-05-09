# 01 · Overview arquitectónico

> Documento vivo. Cualquier cambio material debe rastrearse a un ADR en `docs/adr/`.
> Fuente de verdad de producto: `Interna_Arquitectura_SaaS.docx`.
> Última revisión: 2026-04-22 · FASE 1.

---

## 1. Propósito

Senda es un SaaS multi-tenant para la gestión integral de programas de practicantes. Este documento describe **cómo está construido el sistema**: capas, dominios, responsabilidades y el flujo end-to-end de un request.

El producto tiene 12 dominios totales. El **MVP cubre 9** (Identity, Organization, People, Tasks, Tracking, Notifications, Dashboards, Reports, AI básica). Los 3 restantes (Mentorship, Automation avanzado, OKRs) se dejan para fase 2. Todo el diseño aquí está pensado para que añadir esos dominios después **no requiera re-arquitectura**, solo nuevos módulos.

---

## 2. Principios arquitectónicos (no negociables)

1. **Multi-tenant por diseño.** Ningún módulo se construye sin `tenant_id` en su modelo y sin RLS en su tabla. Detalle en `02-multi-tenancy.md`.
2. **API-first.** Todo lo que hace el frontend se puede hacer vía API pública versionada (`/api/v1/...`). El contrato es OpenAPI 3.1 generado a partir del código.
3. **Event-driven selectivo.** Dominio emite events; listeners y jobs async consumen. No es event sourcing — Postgres sigue siendo fuente de verdad. Detalle en `05-events.md`.
4. **DDD modular ligero.** Cada dominio vive en `services/api/app/Modules/{Dominio}/` con sus propias carpetas `Domain`, `Application`, `Infrastructure`, `Http`. Comunicación entre módulos vía events o interfaces públicas, nunca tocando tablas de otro módulo.
5. **Aislamiento de blast radius.** Un módulo caído no debe tirar el resto. Jobs con timeout + retries + dead letter queue. Circuit breakers en llamadas IA/externas.
6. **Observabilidad nativa.** OpenTelemetry desde el primer request, no como parche. Cada span lleva `tenant_id`, `user_id`, `request_id`.
7. **Costo-consciente.** Stack pensado para soportar 0-50 tenants en Railway con <$200/mes. Plan de migración a GCP documentado en `07-scalability.md`.
8. **Keyboard-first / Realtime / IA como experiencia.** El producto se diferencia por velocidad percibida. Las decisiones técnicas priorizan latencia p95 <300ms en endpoints del día a día.

---

## 3. Capas del sistema

```
┌──────────────────────────────────────────────────────────────┐
│  CAPA 1 · EXPERIENCIA                                        │
│  Next.js 15 (App Router, RSC + Client Components) · PWA      │
│  Mobile nativo (Expo) — fase 2                               │
├──────────────────────────────────────────────────────────────┤
│  CAPA 2 · PRESENTACIÓN                                       │
│  packages/ui · shadcn/ui · Design tokens · i18n es-MX/en-US  │
│  Temas por tenant (CSS variables, overrides via /theme.css)  │
├──────────────────────────────────────────────────────────────┤
│  CAPA 3 · APLICACIÓN / DOMINIOS                              │
│  services/api/app/Modules/*                                  │
│    Identity · Organization · People · Tasks · Tracking       │
│    Notifications · Performance · Reports · AI                │
│  Cada módulo: Domain / Application / Infrastructure / Http   │
├──────────────────────────────────────────────────────────────┤
│  CAPA 4 · SERVICIOS TRANSVERSALES                            │
│  Auth (Sanctum) · RBAC/ABAC (Policies + spatie) · Events     │
│  Jobs (Horizon) · Notifications · Audit log · Feature flags  │
│  Realtime (Reverb) · Storage (R2) · AI client (Claude)       │
├──────────────────────────────────────────────────────────────┤
│  CAPA 5 · DATOS                                              │
│  PostgreSQL 16 + RLS + pgvector · Redis 7 (cache + queues)   │
│  Cloudflare R2 (archivos, PDFs generados)                    │
├──────────────────────────────────────────────────────────────┤
│  CAPA 6 · INFRAESTRUCTURA                                    │
│  Railway (MVP) → GCP Cloud Run (scale)                       │
│  GitHub Actions · OpenTelemetry → Grafana Cloud · Sentry     │
│  Doppler (secrets) · Resend (email)                          │
└──────────────────────────────────────────────────────────────┘
```

Cada capa depende **solo de la capa inmediatamente inferior**. Un controlador HTTP nunca toca la capa de datos directamente; pasa por Application (use cases) que pasa por Infrastructure (repositories).

---

## 4. Dominios (bounded contexts)

### 4.1 Dominios MVP

| Dominio | Responsabilidad | Entidades principales | Eventos clave |
|---|---|---|---|
| **Identity** | Auth, tenants, sesiones, invitaciones | `Tenant`, `User`, `Session`, `Invitation`, `RefreshToken` | `TenantCreated`, `UserInvited`, `UserActivated` |
| **Organization** | Estructura empresarial | `Department`, `Area`, `Team`, `Membership` | `TeamCreated`, `MembershipChanged` |
| **People** | Perfiles, roles, practicantes, mentores | `Profile`, `Role`, `InternProfile`, `MentorProfile` | `ProfileUpdated`, `InternAssignedToMentor` |
| **Tasks** | Actividades, estados, Kanban | `Project`, `List`, `Task`, `Subtask`, `Comment`, `Attachment`, `TimeEntry` | `TaskCreated`, `TaskStateChanged`, `TaskCommented` |
| **Tracking** | Reporte diario, bitácora, blockers | `DailyReport`, `Bitacora`, `Blocker` | `DailyReportSubmitted`, `BlockerRaised` |
| **Notifications** | In-app, email, preferencias | `Notification`, `NotificationPreference`, `DeliveryAttempt` | `NotificationDispatched` |
| **Performance** (simple MVP) | Scorecards + KPIs auto | `Scorecard`, `Evaluation`, `Kpi`, `KpiSnapshot` | `EvaluationScheduled`, `EvaluationSubmitted` |
| **Reports** | PDF universidad, exports | `ReportTemplate`, `ReportRun`, `Export` | `ReportGenerated` |
| **AI** | Resúmenes, insights de bloqueo | `AiSummary`, `AiInsight`, `Embedding` | `SummaryGenerated`, `InsightDetected` |

### 4.2 Dominios fase 2 (reservados en el diseño)

`Mentorship`, `Automation` (rule engine), `OKRs`, `Gamification`, `Communication` avanzado (canales estilo Slack), `Marketplace` (talento verificado).

### 4.3 Mapa de dependencias entre dominios

```
                           Identity
                              │
                              ▼
                        Organization
                              │
                              ▼
                           People
                              │
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
         Tasks           Tracking          Performance
           │                  │                  │
           └──────┬───────────┴──────────────────┘
                  ▼
           Notifications
                  │
                  ▼
              Reports
                  │
                  ▼
                 AI  (transversal: lee de Tasks/Tracking/Performance)
```

**Reglas:**
- Dependencias siempre unidireccionales (sin ciclos).
- `Notifications`, `Reports`, `AI` solo consumen eventos de dominios superiores, **nunca** son consumidos.
- `Identity` no conoce a nadie; `Organization` conoce `Identity`; etc.
- Una violación de estas reglas requiere ADR explícito.

---

## 5. Estructura del repositorio (monorepo)

```
seguimiento-backend/                     (raíz del workspace)
├── apps/
│   └── web/                             Next.js 15 (web PWA)
│       ├── app/                         App Router
│       ├── features/                    features por dominio (tasks/, people/, ...)
│       ├── components/
│       │   ├── ui/                      shadcn primitives
│       │   └── shared/                  TaskCard, PersonRow, etc.
│       ├── lib/                         api client, auth, realtime
│       └── hooks/
├── services/
│   └── api/                             Laravel 12 + Octane
│       ├── app/
│       │   ├── Modules/                 un dir por dominio
│       │   │   ├── Identity/
│       │   │   │   ├── Domain/          entidades, VOs, enums, events
│       │   │   │   ├── Application/     use cases, services, DTOs
│       │   │   │   ├── Infrastructure/  repositories, external clients
│       │   │   │   └── Http/            controllers, requests, resources, routes
│       │   │   └── ...
│       │   ├── Shared/                  base classes (BaseModel con scope tenant)
│       │   └── Support/                 helpers, casts, macros
│       ├── config/
│       ├── database/
│       │   ├── migrations/              ordenadas por dominio
│       │   └── seeders/
│       ├── routes/
│       │   └── api/
│       │       └── v1.php               carga rutas de cada módulo
│       └── tests/
│           ├── Feature/
│           └── Unit/
├── packages/
│   ├── types/                           OpenAPI → TS types
│   └── config/                          shared tsconfig, eslint, prettier
├── docs/
│   ├── architecture/                    01-overview, 02-multi-tenancy, ...
│   ├── adr/                             0001-stack, 0002-multi-tenancy, ...
│   └── modules/                         README por módulo (creados en fase 3)
├── infra/
│   ├── docker/                          Dockerfiles prod (web, api, worker, reverb)
│   └── railway/                         railway.json, plantillas
├── .github/
│   └── workflows/                       lint, test, build, deploy
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

**Por qué monorepo:** un solo dev, una sola PR para cambios que tocan web + api (ej. nuevo endpoint + consumo), tipos TS generados desde OpenAPI viven en `packages/types` y se consumen en web sin publicar paquetes.

---

## 6. Estructura interna de un módulo (DDD ligero)

Usando `Tasks` como ejemplo:

```
app/Modules/Tasks/
├── Domain/
│   ├── Task.php                         Entidad (Eloquent model)
│   ├── TaskState.php                    Enum con FSM
│   ├── Priority.php                     Enum
│   ├── Events/
│   │   ├── TaskCreated.php
│   │   ├── TaskStateChanged.php
│   │   └── TaskAssigned.php
│   └── Exceptions/
│       └── InvalidTaskTransition.php
├── Application/
│   ├── Commands/
│   │   ├── CreateTask.php               DTO de entrada
│   │   ├── CreateTaskHandler.php        Use case
│   │   └── ChangeTaskState.php
│   ├── Queries/
│   │   ├── ListTasksByProject.php
│   │   └── ListTasksByAssignee.php
│   └── Services/
│       └── TaskTimerService.php
├── Infrastructure/
│   ├── Persistence/
│   │   └── TaskRepository.php           (interface en Domain si hace falta)
│   └── Notifications/
│       └── TaskAssignedNotification.php
└── Http/
    ├── Controllers/
    │   └── TaskController.php
    ├── Requests/
    │   ├── CreateTaskRequest.php
    │   └── UpdateTaskRequest.php
    ├── Resources/
    │   ├── TaskResource.php
    │   └── TaskCollection.php
    ├── Policies/
    │   └── TaskPolicy.php
    └── routes.php                       incluido desde routes/api/v1.php
```

**Regla crítica:** Controllers **no** hacen lógica de negocio. Solo validan el request (FormRequest), autorizan (Policy), invocan un Command/Query handler, y mapean el resultado a un Resource.

---

## 7. Flujo end-to-end de un request

Ejemplo: practicante crea una tarea desde la web.

```
┌────────────────────────────────────────────────────────────────────┐
│ 1. USER (Browser)                                                  │
│    Clic en "Nueva tarea" → modal → submit                          │
│    ↓                                                               │
│ 2. Next.js Client Component                                        │
│    useMutation(createTask) via TanStack Query                      │
│    POST /api/v1/tasks con JWT en Cookie httpOnly                   │
│    ↓                                                               │
│ 3. Edge (Railway / Cloudflare)                                     │
│    TLS, rate limit global, WAF básico                              │
│    ↓                                                               │
│ 4. Laravel Octane (RoadRunner worker)                              │
│    a) ResolveTenantMiddleware                                      │
│       - Lee subdomain → busca tenant → set_config('app.tenant_id') │
│       - Registra tenant_id en OTel span                            │
│    b) AuthenticateMiddleware                                       │
│       - Valida Sanctum cookie → carga user                         │
│       - user.tenant_id DEBE coincidir con app.tenant_id            │
│    c) RateLimitMiddleware                                          │
│       - 60 req/min por user, 600/min por tenant                    │
│    ↓                                                               │
│ 5. Router → TaskController@store                                   │
│    a) CreateTaskRequest valida payload (form request)              │
│    b) Policy: $user->can('create', Task::class)                    │
│    c) Invoca CreateTaskHandler::handle($command)                   │
│    ↓                                                               │
│ 6. Application layer · CreateTaskHandler                           │
│    a) DB::transaction(function() {                                 │
│         $task = Task::create([...])                                │
│         $task->assignees()->sync(...)                              │
│         event(new TaskCreated($task));                             │
│       })                                                           │
│    b) Evento TaskCreated se dispatcha tras commit                  │
│    ↓                                                               │
│ 7. Event listeners (sync + async)                                  │
│    a) Sync: Actividad auditada en activity_log                     │
│    b) Async queue: NotifyAssignees, BroadcastToBoard (Reverb)      │
│    c) Async queue: IndexTaskForSearch                              │
│    ↓                                                               │
│ 8. Response                                                        │
│    TaskResource::make($task)->response()                           │
│    201 Created + payload JSON                                      │
│    ↓                                                               │
│ 9. Next.js                                                         │
│    TanStack Query actualiza cache (optimistic + real)              │
│    Reverb WebSocket notifica a otros clientes del tablero          │
│    UI muestra toast + card aparece en Kanban                       │
└────────────────────────────────────────────────────────────────────┘
```

**Latencia objetivo (p95):**
- Edge → Octane: <30ms
- Middlewares (tenant + auth + rate limit): <10ms combinado
- Handler + DB insert: <80ms
- Event dispatch sync: <5ms
- Response serialization: <15ms
- **Total servidor: <150ms**
- **Total percibido (con red LATAM): <300ms**

---

## 8. Runtime processes

En producción, conviven 4 tipos de procesos:

| Proceso | Tecnología | Función | Escalado |
|---|---|---|---|
| `web` | Next.js standalone | Render SSR/RSC, servir estáticos | 1 instancia MVP, N por réplica |
| `api` | Laravel Octane (RoadRunner) | HTTP API | 1 instancia MVP (2 workers), N horizontal |
| `worker` | Laravel Horizon | Jobs async (notifications, AI, PDF) | 1 instancia MVP, escala por cola |
| `reverb` | Laravel Reverb | WebSocket server | 1 instancia MVP, sticky sessions para escalar |

En Railway cada uno es un **service separado** con su propio Dockerfile en `infra/docker/`.

`api`, `worker` y `reverb` comparten la misma codebase Laravel pero difieren en el `CMD` del Dockerfile.

---

## 9. Comunicación entre componentes

| De → A | Protocolo | Notas |
|---|---|---|
| Next.js → API Laravel | HTTPS + cookies Sanctum | Mismo dominio raíz (`interna.app` y `api.interna.app`) para cookies cross-subdomain |
| Next.js → Reverb | WebSocket (wss) | Token Sanctum en connection payload |
| API → Worker (Horizon) | Redis (queue) | Jobs serializados como payload JSON |
| API → Reverb | Redis pub/sub | Broadcasting via `BROADCAST_DRIVER=reverb` |
| Worker → Claude API | HTTPS | Circuit breaker + retries exponenciales |
| Worker → R2 | S3 API (HTTPS) | Pre-signed URLs para descargas desde web |
| API → Postgres | TCP (SSL) | Connection pool via PgBouncer (Railway add-on) |
| API → Redis | TCP (TLS) | Prefijo de keys `tenant:{id}:...` |

---

## 10. Tenancy en el flujo

Cada request pasa por `ResolveTenantMiddleware` que hace **3 cosas indelegables**:

1. **Resuelve tenant** desde `Host` header (subdomain) o desde el claim `tenant_id` del token.
2. **Hace `SELECT set_config('app.tenant_id', '{uuid}', true)`** al inicio de la transacción. RLS lo usa.
3. **Registra `tenant_id` en OpenTelemetry** para que cualquier trace/log/métrica quede correlacionado.

Si falta cualquiera de los tres, el request **muere con 400 antes de llegar al controlador**. Esto se testea con `tests/Feature/TenantIsolationTest.php`.

Detalle completo en `02-multi-tenancy.md`.

---

## 11. Frontend: decisiones arquitectónicas clave

- **Server Components por defecto.** Dashboards (listas, widgets iniciales) se renderizan en RSC para TTFB bajo y SEO. Client Components solo donde hay interacción pesada (Kanban drag, Cmd+K, timers).
- **TanStack Query como cache client.** Todas las mutaciones y subscriptions realtime pasan por aquí. Un evento Reverb invalida queries específicas (`invalidateQueries(['tasks', projectId])`).
- **Zustand para UI state efímero.** Sidebar collapsed, modal abierto, tab activo. Nada de datos de servidor.
- **nuqs para URL state.** Filtros de tabla, vista (lista/kanban/timeline), page. Compartible vía link.
- **Optimistic updates obligatorios** en acciones del día a día (move task, toggle checkbox, comment). Rollback transparente si falla.
- **Design tokens en CSS variables** (`--color-brand-primary`, `--radius-md`, `--space-4`). Cada tenant puede override vía endpoint `/api/v1/tenant/theme.css` generado server-side.

---

## 12. Qué se deja fuera del MVP (conscientemente)

| Ítem | Motivo | Cuándo |
|---|---|---|
| Mobile nativo (React Native) | PWA cubre flujo 20s del practicante | Fase 2 |
| SSO SAML/OIDC enterprise | Email + Google OAuth bastan para MVP | Primer cliente enterprise |
| White-label con dominio custom | Subdominio `tenant.interna.app` basta | Primer cliente enterprise |
| Automation visual (rule engine) | Reemplazado con eventos + jobs pre-cableados en MVP | Fase 2 |
| Gamificación | No es diferenciador de venta inicial | Tras feedback de 5 tenants |
| OKRs completos | Evaluaciones simples cubren el caso | Fase 2 |
| Mentorship nativo | RRHH puede usar sesiones como Tasks tipo "1:1" | Fase 2 |
| Multi-región | Single LATAM para todos los tenants MVP | A demanda Enterprise |
| CRDT (Yjs) co-edición | Optimistic updates basta | Solo si se vende como feature |
| Marketplace de talento | Requiere masa crítica de egresados | Fase 3 |

Cada uno tiene un issue creado con el contexto suficiente para retomarlo sin perder lo decidido.

---

## 13. Referencias cruzadas

- **Multi-tenancy:** `02-multi-tenancy.md` (RLS, resolución, tests)
- **Seguridad:** `03-security.md` (auth, RBAC+ABAC, OWASP)
- **Realtime:** `04-realtime.md` (Reverb, canales, presencia)
- **Events:** `05-events.md` (domain events, jobs, idempotencia)
- **Caching:** `06-caching.md` (Redis, TTLs, invalidación)
- **Escalabilidad:** `07-scalability.md` (Railway → GCP, métricas)
- **ERD:** `08-erd.md` (FASE 2 — pendiente)
- **ADR 0001:** `docs/adr/0001-stack-baseline.md` (decisión de stack completa)
