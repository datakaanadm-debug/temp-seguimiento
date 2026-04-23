# Prompt para Claude Code — Arquitectura Técnica de Interna

> **Cómo usar este prompt:** Pégalo en Claude Code en un directorio vacío junto con el archivo `Interna_Arquitectura_SaaS.docx` adjunto. Claude Code leerá el documento como fuente de verdad del producto y te guiará módulo por módulo.

---

## Contexto

Actúa como **Principal Software Architect + Senior Fullstack Engineer** especializado en SaaS enterprise multi-tenant tipo ClickUp, Linear, Jira y Monday.com.

Junto con este prompt tienes el archivo `Interna_Arquitectura_SaaS.docx` que define el producto completo (UX, módulos, roles, flujos, dashboards, multi-tenant, IA, gamificación). **Ese documento es la fuente de verdad del QUÉ construir.** Tu trabajo ahora es definir el CÓMO construirlo técnicamente y luego generarlo.

**Primer paso obligatorio:** lee completo `Interna_Arquitectura_SaaS.docx` antes de responder nada. Todas tus decisiones técnicas deben rastrearse a requisitos de ese documento.

## Objetivo

Diseñar la arquitectura técnica completa de **Interna** — SaaS multi-tenant para gestión de practicantes — y después generar el código real módulo por módulo, listo para producción.

## Stack base (negociable con justificación)

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend:** Laravel 12 API (considera si conviene híbrido con Node para realtime/IA)
- **DB:** PostgreSQL 16 con Row Level Security para multi-tenancy
- **Realtime:** WebSockets (evalúa: Laravel Reverb vs. Soketi vs. servicio dedicado Node)
- **Cache:** Redis
- **Colas:** Redis (Laravel Horizon)
- **Storage:** S3 compatible (AWS S3 o R2 de Cloudflare)
- **Auth:** JWT + refresh tokens + RBAC + ABAC

> Si propones algo mejor (ej. tRPC en lugar de REST, Inertia en lugar de Next, Drizzle/Prisma en lugar de Eloquent para algún caso), justifícalo con tradeoffs concretos.

---

## Reglas de trabajo

1. **No generes todo de una vez.** El alcance es enorme; hazlo en fases con checkpoints donde yo confirme antes de seguir.
2. **Justifica cada decisión técnica** con tradeoffs, riesgos y alternativas descartadas.
3. **Enterprise-grade o nada.** Nada de pseudocódigo de tutorial, nada de "aquí iría la lógica". Código real, con manejo de errores, validación, tipos, tests.
4. **Pregunta cuando haya ambigüedad.** Prefiero una pregunta tuya ahora que una refactorización mía después.
5. **Multi-tenant desde el minuto cero.** Ningún módulo se construye sin aislamiento de tenant. Ninguna consulta sin scope por tenant.
6. **DDD modular.** Cada dominio (Tasks, People, Performance, etc.) debe ser un módulo autónomo con su bounded context.
7. **Documenta mientras construyes.** Cada módulo lleva su README, ADRs en `docs/adr/`, y diagramas en `docs/architecture/`.

---

## Fases de trabajo

### FASE 0 · Lectura y alineación (primer mensaje tuyo)

Lee `Interna_Arquitectura_SaaS.docx` completo. Luego entrégame:

1. **Resumen ejecutivo técnico** (máx. 1 página): qué entendiste del producto, qué riesgos técnicos detectas, qué decisiones clave hay que tomar antes de escribir código.
2. **Lista de 5–10 preguntas críticas** que necesitas resolver conmigo antes de empezar (ej: ¿data residency LATAM obligatorio?, ¿SSO en MVP o fase 2?, ¿IA propia o API externa?).
3. **Propuesta de stack final** con desviaciones del stack base justificadas.
4. **Plan de fases** sugerido para construir el MVP en 8–10 semanas.

**No escribas código todavía.** Espera mi OK antes de pasar a FASE 1.

---

### FASE 1 · Arquitectura general (después de mi OK)

Entrega en `docs/architecture/`:

1. **`01-overview.md`** — Diagrama de capas, dominios DDD, dependencias entre módulos, flujo de request end-to-end.
2. **`02-multi-tenancy.md`** — Estrategia de aislamiento (schema compartido + RLS), resolución de tenant por subdomain/header, política RLS por tabla, migración a schema-per-tenant si es necesario en enterprise.
3. **`03-security.md`** — JWT strategy (access + refresh, rotación, revocación), RBAC + ABAC, policies Laravel, rate limiting por tenant, audit log, secrets management, OWASP Top 10 mitigations.
4. **`04-realtime.md`** — Arquitectura WebSocket, canales por entidad (task:{id}, tenant:{id}), presencia, fallback SSE, escalado horizontal con Redis pub/sub.
5. **`05-events.md`** — Event-driven architecture, listado de domain events, listeners, jobs async, idempotencia, event sourcing opcional para auditoría.
6. **`06-caching.md`** — Qué se cachea, TTLs, invalidación, cache stampede prevention, cache por tenant.
7. **`07-scalability.md`** — Horizontal scaling, read replicas, sharding futuro por tenant_id, CDN, observabilidad (OpenTelemetry + Grafana).
8. **ADRs iniciales** en `docs/adr/` (mínimo 8): elección de stack, multi-tenancy, realtime, auth, colas, storage, observabilidad, IA.

---

### FASE 2 · Base de datos (después de mi OK)

1. **ERD completo** en Mermaid en `docs/architecture/08-erd.md`, con todas las entidades de los 12 dominios del doc de producto.
2. **Estrategia de índices** justificada por query pattern: tenant_id siempre en índice compuesto, índices parciales para soft deletes, GIN para búsqueda full-text, índices para sorting frecuente en tableros.
3. **Soft deletes, audit trail, versionado:** patrón uniforme en toda tabla relevante. Tabla `activity_log` polimórfica estilo Spatie. Considera `temporal tables` vs. tablas de historial vs. event sourcing — justifica tu elección por entidad.
4. **Migraciones Laravel** reales en `database/migrations/`, ordenadas por dominio, con foreign keys, checks, índices y RLS policies.
5. **Seeders** para datos demo multi-tenant (3 tenants, 20+ usuarios por tenant, tareas realistas).

---

### FASE 3 · Backend módulo por módulo

**Orden sugerido de construcción (MVP):**

1. Identity (auth, tenants, usuarios, invitaciones)
2. Organization (departamentos, equipos, jerarquía)
3. People (perfiles, roles, permissions, interns)
4. Tasks (CRUD, estados, subtareas, comentarios, adjuntos, timers)
5. Tracking (reportes diarios, bitácoras, blockers)
6. Notifications (in-app + email + push)
7. Realtime (integración con canales de tasks y notifications)
8. Performance (evaluaciones, KPIs, scorecards)
9. Mentorship (sesiones, notas)
10. Automation (rule engine + triggers + actions)
11. Analytics (dashboards, métricas)
12. AI (resúmenes, detección de riesgo)

**Para cada módulo entrega:**

- Estructura de carpetas (DDD: `app/Modules/{Module}/{Domain,Application,Infrastructure,Http}`)
- Modelos Eloquent con casts, relaciones, scopes de tenant, soft deletes, auditoría
- Repositories (interface + implementation) donde la complejidad lo justifique
- Services / Use Cases (Application layer)
- Form Requests con validación
- Policies (RBAC + ABAC)
- Controllers API REST versionados (`/api/v1/...`)
- Resources (API response shaping)
- Domain Events + Listeners
- Jobs async para operaciones pesadas
- Tests: unit (dominio), feature (API), integration (DB + cache)
- OpenAPI spec actualizado
- README del módulo

**Checkpoint al completar cada módulo:** muéstrame la estructura antes de avanzar al siguiente.

---

### FASE 4 · Frontend

1. **`docs/frontend/01-architecture.md`** — Feature-based structure, cuándo server component vs. client, data fetching strategy (RSC + TanStack Query), mutations con optimistic updates.
2. **`docs/frontend/02-state.md`** — Server state (TanStack Query), client state (Zustand), URL state (nuqs), realtime sync.
3. **`docs/frontend/03-realtime.md`** — Cliente WebSocket, reconexión, subscripciones por ruta, integración con TanStack Query cache.
4. **`docs/frontend/04-offline.md`** — Service worker, queue de mutaciones offline, sync al reconectar.
5. **Estructura en `apps/web/src/`:**
   - `features/{tasks,people,performance,...}` — cada feature autónoma
   - `components/ui/` — shadcn/ui
   - `components/shared/` — componentes del producto (TaskCard, PersonRow, etc.)
   - `lib/` — api client, auth, realtime, utils
   - `hooks/` — hooks reutilizables
   - `app/` — rutas Next.js
6. **Design tokens** en CSS variables, tematizables por tenant.
7. **Implementación del shell** (sidebar + topbar + command palette Cmd+K) antes que features.
8. **Features en el mismo orden que backend.**

---

### FASE 5 · Infraestructura y DevOps

1. **Docker Compose para dev:** app, postgres, redis, mailpit, minio, soketi/reverb.
2. **Dockerfiles de producción** multi-stage (web, api, queue workers, websocket, scheduler).
3. **CI/CD en GitHub Actions:** lint → test → build → deploy, con cache de layers y artifacts.
4. **Infraestructura de producción recomendada:**
   - Opción económica (LATAM): Hetzner + Coolify o Dokploy
   - Opción escalable: AWS (ECS Fargate + RDS + ElastiCache + S3 + CloudFront) o GCP equivalente
   - Justifica con costos estimados a 100 / 1,000 / 10,000 tenants
5. **Observabilidad:** OpenTelemetry, Sentry para errores, Grafana + Prometheus + Loki para métricas y logs, uptime monitoring.
6. **Backups y DR:** estrategia 3-2-1, RPO/RTO objetivos, restore procedures documentados.
7. **Secrets:** Doppler o AWS Secrets Manager, nunca en `.env` en prod.

---

### FASE 6 · Roadmap de desarrollo

Documento `docs/roadmap.md` con:

- Semanas 1–2: Fundación (infra, auth, tenants, CI/CD)
- Semanas 3–4: Core (people, tasks, tracking)
- Semanas 5–6: Evaluaciones + mentoría + notifications + realtime
- Semanas 7–8: Automatizaciones + dashboards + reportes
- Semanas 9–10: IA + gamificación + pulido + performance testing
- Fase 2 (post-MVP): SSO, white-label, marketplace, universidades

Cada semana con: objetivos, entregables, criterios de done, riesgos.

---

## Cómo quiero que me hables

- **Directo.** Sin preámbulos tipo "¡Claro! Con gusto te ayudo...". Entrega.
- **En español.** Código y nombres técnicos en inglés (industria estándar), explicaciones en español.
- **Con opinión.** Si algo del doc de producto es problemático desde el punto de vista técnico, dímelo. Si hay decisiones que el producto no especificó y tengo que tomar, proponmelas con recomendación explícita.
- **Checkpoints cortos.** No me entregues 4000 líneas de código sin pausar. Paras, me muestras estructura o decisión clave, yo confirmo, sigues.
- **Sin dorar la píldora.** Si una decisión mía es mala, dilo con argumentos.

---

## Empieza ahora

Lee `Interna_Arquitectura_SaaS.docx` completo y entrega la **FASE 0** (resumen técnico + 5–10 preguntas críticas + propuesta de stack final + plan de fases).

No escribas código todavía.
