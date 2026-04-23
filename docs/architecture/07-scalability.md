# 07 · Escalabilidad y observabilidad

> Arquitectura para operar eficiente en MVP (<50 tenants) con path documentado hasta ~10k tenants sin re-arquitecturar.

---

## 1. Fases de infraestructura

| Fase | Tenants | Usuarios concurrentes | Stack | Costo/mes |
|---|---|---|---|---|
| 0 · MVP | 0-20 | <500 | Railway todo-en-uno | $40-150 |
| 1 · Tracción | 20-100 | 500-3000 | Railway con réplicas + Redis dedicado | $200-500 |
| 2 · Growth | 100-1000 | 3000-15000 | GCP Cloud Run + Cloud SQL + Memorystore | $800-3000 |
| 3 · Enterprise | 1000+ | 15000+ | GCP multi-región + Enterprise plan | $3000+ |

El diseño no cambia entre fases. Solo cambia dónde corre y cuántas réplicas.

---

## 2. Fase 0 · MVP en Railway

### 2.1 Servicios

| Service | Runtime | Memoria | Replicas | Propósito |
|---|---|---|---|---|
| `web` | Node 20 | 512MB-1GB | 1 | Next.js standalone |
| `api` | PHP 8.3 + Octane | 1GB | 1 | Laravel HTTP API |
| `worker` | PHP 8.3 | 512MB | 1 | Horizon queues |
| `reverb` | PHP 8.3 | 512MB | 1 | WebSocket server |
| `scheduler` | PHP 8.3 | 256MB | 1 | Cron |
| `postgres` | Postgres 16 add-on | 1GB+20GB | managed | DB primaria |
| `redis` | Redis 7 add-on | 256MB | managed | Cache + queue + broadcast |

Total memoria: ~4GB. Railway bill estimado: ~$80-120/mes inicial.

### 2.2 Límites a monitorear

- **Postgres connections:** Laravel pool default 10/worker. Con Octane 2 workers y Horizon 2-3 procesos → ~60 conns. Postgres managed de Railway maneja 100 por default; headroom OK.
- **Redis memoria:** 256MB alcanza para ~50k keys + cola razonable. Alertar >200MB.
- **CPU api:** Octane con 2 workers aguanta ~300 req/s. Alertar >70% sostenido.
- **Reverb conexiones:** ~1000 sockets sin sweat en 512MB.

### 2.3 Deploy y rollback

- Cada push a `main` → deploy automático tras CI green.
- Railway mantiene últimas 5 revisiones; rollback con un clic.
- **Migraciones de DB:** corren en pre-deploy hook del service `api`. Si fallan, deploy aborta.
- Pattern **expand/contract** para migraciones de schema sin downtime.

---

## 3. Fase 1 · Réplicas en Railway

### 3.1 Triggers para entrar en esta fase

Cualquiera de:
- >20 tenants.
- CPU api p95 >70% sostenido 7 días.
- Postgres CPU p95 >60%.
- Cola `broadcasting` con depth >100 sostenido.

### 3.2 Cambios técnicos

- `api` escala a 2-3 réplicas. Octane (stateless) lo permite sin cambios.
- `worker` escala a 2 réplicas con Horizon rebalancing automático.
- `reverb` escala a 2 réplicas con **sticky sessions** por IP hash en Railway load balancer.
- Redis sube a 1GB.
- Postgres sube a 2GB RAM + 50GB storage.
- Añadir Postgres **read replica** managed. Laravel `config/database.php` lee de réplica para queries no críticas:

```php
'connections' => [
    'pgsql' => [
        'read' => [
            'host' => [env('DB_READ_HOST')],
        ],
        'write' => [
            'host' => [env('DB_HOST')],
        ],
        'sticky' => true, // dentro del request, tras write usa writer
        // ...
    ],
],
```

Queries candidatas a réplica: dashboards, reportes, analytics. Queries de detalle de Task, People, etc: siguen contra primary para consistencia.

### 3.3 Observabilidad crece

- Grafana Cloud free deja de alcanzar (>10k series). Migrar a Grafana Cloud Pro (~$49/mes) o self-host LGTM en un dropplet.
- Sentry plan Team (~$26/mes) si errores/mes >5k.

---

## 4. Fase 2 · GCP Cloud Run

### 4.1 Por qué migrar

- Precio unitario de Railway sube rápidamente (replicas premium).
- Necesidad de regiones específicas (São Paulo para LATAM, Iowa para US enterprise).
- VPC propia, IAM granular.
- SLA productivo formal (Railway SLA es 99.9%, aceptable pero sin redundancia multi-az).

### 4.2 Arquitectura target

```
                ┌─────────────────────────────────────────────────┐
                │                  Cloudflare                     │
                │    (DNS, WAF, rate limit global, cache CDN)     │
                └───────────────────┬─────────────────────────────┘
                                    │
                      ┌─────────────┴──────────────┐
                      │                            │
            ┌─────────▼──────────┐      ┌──────────▼─────────┐
            │ Cloud Run · web    │      │ Cloud Run · api    │
            │ Next.js            │      │ Laravel Octane     │
            │ min=1, max=N       │      │ min=2, max=N       │
            └────────────────────┘      └──────────┬─────────┘
                                                   │
                         ┌─────────────────────────┼─────────────────────────┐
                         │                         │                         │
                ┌────────▼────────┐      ┌─────────▼────────┐      ┌─────────▼────────┐
                │ Cloud Run       │      │ Cloud SQL (HA)    │      │ Memorystore      │
                │ worker (Horizon)│      │ Postgres 16       │      │ Redis 7          │
                │ min=1, max=N    │      │ + read replica    │      │ Standard HA      │
                └─────────────────┘      └───────────────────┘      └──────────────────┘

                ┌─────────────────┐      ┌───────────────────┐      ┌──────────────────┐
                │ Cloud Run       │      │ Cloudflare R2     │      │ Secret Manager   │
                │ reverb          │      │ Storage           │      │                  │
                └─────────────────┘      └───────────────────┘      └──────────────────┘
```

### 4.3 Migración paso a paso

1. **Preparar**: crear proyecto GCP, VPC, Cloud SQL, Memorystore. Configurar Cloud Run services con las mismas env vars.
2. **Staging en paralelo**: apuntar `staging.interna.app` a GCP, mantener `interna.app` en Railway. Smoke tests.
3. **Datos**: `pg_dump | pg_restore` de Railway → Cloud SQL en ventana de mantenimiento (~10 min downtime aceptable MVP).
4. **DNS flip**: cambiar `interna.app` a GCP. TTL bajo las 24h previas.
5. **Rollback plan**: mantener Railway caliente 72h. DNS de vuelta si hay issue crítico.

Ventana sugerida: viernes noche LATAM (domingo madrugada para USA/EU si ya hay clientes enterprise).

### 4.4 Cambios en código

Casi ninguno. Dockerfiles ya son portables. Solo:
- Adaptar `DATABASE_URL` al formato Cloud SQL (Cloud SQL Proxy o socket Unix).
- `REDIS_URL` al formato Memorystore (TLS con cert CA de Google).
- Logs a Cloud Logging (OTel exporter gRPC) en paralelo a Grafana Loki.

---

## 5. Postgres: patrones de escalado

### 5.1 Índices desde el día 1

Todas las tablas de dominio: índice compuesto `(tenant_id, <campo frecuente>)`. Sin este índice, RLS obliga a scans. Ejemplos:

```sql
CREATE INDEX idx_tasks_tenant_project_state
    ON tasks (tenant_id, project_id, state)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_tasks_tenant_assignee_due
    ON tasks (tenant_id, assignee_id, due_at)
    WHERE deleted_at IS NULL AND state != 'DONE';

CREATE INDEX idx_daily_reports_tenant_user_date
    ON daily_reports (tenant_id, user_id, report_date DESC);

-- Full-text search
CREATE INDEX idx_tasks_search
    ON tasks USING GIN (to_tsvector('spanish', title || ' ' || coalesce(description, '')))
    WHERE deleted_at IS NULL;
```

### 5.2 Particionamiento (fase 2+)

Tablas `activity_log`, `notifications`, `ai_request_log` crecen sin parar. Particionar **por rango de fecha** mensual:

```sql
CREATE TABLE activity_log (
    -- ...
) PARTITION BY RANGE (created_at);

CREATE TABLE activity_log_2026_04 PARTITION OF activity_log
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
```

Auto-creación de particiones con `pg_partman`. Archivar particiones >2 años a R2 (cold storage) y detach.

### 5.3 Sharding por tenant (fase 3)

Solo si un solo Postgres ya no aguanta (>500 tenants activos o TB de data).
Opciones:
- **Citus extension** (convierte Postgres en distribuido por `tenant_id`). Postgres nativo, menos fricción.
- **Separar por tiers**: tenants Enterprise a DB propia; resto compartidos.

Preparación desde hoy: las foreign keys nunca cruzan tenants. El shard key natural es `tenant_id`.

### 5.4 Connection pooling

PgBouncer (modo transaction) entre Laravel y Postgres desde fase 1. Razones:
- Octane mantiene workers persistentes con conns idle.
- Evita alcanzar límite de Postgres bajo picos.

Configuración:
```
pool_mode = transaction
max_client_conn = 500
default_pool_size = 20
```

---

## 6. Colas: escalado

Horizon escala procesos automáticamente (`balance: auto`). Por cola:

| Cola | Prioridad | Procesos min-max | Justificación |
|---|---|---|---|
| `broadcasting` | alta | 2-10 | Baja latencia requerida |
| `notifications` | alta | 2-10 | Experiencia usuario |
| `ai` | media | 1-5 | Rate limit externo |
| `reports` | baja | 1-3 | Batch, no urgente |
| `search` | baja | 1-3 | Async sin urgencia |
| `scheduled` | media | 1-2 | Cron jobs |

Si una cola tiene depth >1000 sostenido → Horizon agrega procesos dentro del rango. Si el tope no alcanza, alertar.

---

## 7. Storage (R2)

R2 escala infinitamente para nuestros tamaños esperados. Consideraciones:

- **Lifecycle policies**: mover adjuntos >1 año a Infrequent Access (más barato, igual performance cold).
- **Egress**: R2 zero egress fees es clave para LATAM. Mantener R2 incluso en fase 2 GCP (no usar Cloud Storage por costo).
- **Pre-signed URLs**: TTL 15 min para descargas, 5 min para uploads.

---

## 8. Observabilidad

### 8.1 Stack

| Señal | Herramienta | Retención |
|---|---|---|
| Errores | Sentry | 90 días |
| Logs | Grafana Loki (cloud free → self-hosted) | 14 días hot, 1 año cold |
| Métricas | Prometheus (remote-write a Grafana Cloud) | 30 días |
| Traces | Tempo vía OpenTelemetry | 7 días (sample 10%, 100% errors) |
| Uptime | Cronitor o UptimeRobot free | perpetuo |
| RUM (frontend) | Sentry performance o Vercel Analytics | 30 días |

### 8.2 OpenTelemetry setup

Backend Laravel: `open-telemetry/opentelemetry` + exporter OTLP HTTP a Grafana Cloud.
Frontend Next.js: `@vercel/otel` + exporter OTLP.

Atributos globales obligatorios:
- `tenant.id`, `tenant.slug`
- `user.id`, `user.role`
- `http.route`, `http.method`, `http.status_code`
- `db.statement.hash` (no statement completo, evitar PII)
- `deployment.environment`, `service.version`

### 8.3 Dashboards Grafana (MVP)

1. **API Health**: rpm, p50/p95/p99 latencia, error rate (4xx, 5xx), CPU, memoria.
2. **Database**: conexiones activas, query time top 10, locks, cache hit rate Postgres.
3. **Queues**: depth, processing rate, failure rate por cola.
4. **Realtime**: conexiones activas, broadcasts/sec, auth failures.
5. **Per-tenant (top 10)**: requests, errores, storage usado.
6. **Frontend**: LCP, FID, CLS (Core Web Vitals), errores JS.
7. **AI**: tokens/día, costo estimado, latencia Claude, rate limits hit.
8. **Business**: tenants activos, logins/día, tareas creadas, reportes generados.

### 8.4 Alertas (MVP mínimas)

| Alert | Condición | Canal | Severidad |
|---|---|---|---|
| API 5xx spike | >1% 5xx en 5 min | Email + Sentry | P1 |
| DB connections exhausted | >80% del pool 5 min | Email | P1 |
| Queue depth anormal | `broadcasting`/`notifications` >500 por 10 min | Email | P2 |
| Disk Postgres | >80% de capacidad | Email | P2 |
| Redis memory | >80% | Email | P2 |
| AI quota hit | 80% del presupuesto mensual | Email | P3 |
| SSL cert expiración | <30 días | Email | P3 |
| Tenant errors burst | 1 tenant con >100 errores/10min | Email | P2 (investigar) |

---

## 9. Backups y disaster recovery

### 9.1 RPO/RTO MVP

- **RPO (Recovery Point Objective):** 24h aceptable en MVP (pérdida máxima de data de 1 día).
- **RTO (Recovery Time Objective):** 4h aceptable.

### 9.2 Estrategia

- **Postgres**: Railway/GCP managed backups diarios + PITR (point-in-time recovery) de últimas 7 días.
- **Replicas off-site**: `pg_dump` diario a R2 cross-región (US) cifrado. Script cron: cada 03:00 UTC.
- **Retención**: 7 diarios, 4 semanales, 12 mensuales.
- **R2**: versioning habilitado en bucket. Lifecycle mueve versiones viejas a cold tras 30 días.
- **Redis**: efímero; se acepta pérdida. Jobs persistentes usan `failed_jobs` tabla en DB.

### 9.3 Restore testing

Trimestral: restaurar backup a entorno staging, verificar integridad y runtime. Documentar duración real (vs. el RTO declarado).

### 9.4 Escenarios de desastre

| Escenario | Acción | RTO estimado |
|---|---|---|
| Cloud Run region down | Redirigir DNS a región secundaria (fase 2+) | 15min |
| DB primary down | Failover a read replica (Cloud SQL HA) | 2min auto |
| Data corruption | PITR al minuto antes del incidente | 30min |
| Ransomware / delete masivo | Restore de backup diario más reciente | 2-4h |
| Railway/GCP outage completo | Correr de restore en otro cloud | 24h (plan documentado, no probado en MVP) |

---

## 10. Costos: tracking

Dashboard mensual:
- GCP billing by service
- Cloudflare usage (R2 storage, Workers, bandwidth)
- Claude API usage (tokens por tenant, costo total)
- Resend (emails enviados)
- Sentry/Grafana Cloud

**Unit economics a seguir**:
- Costo por tenant/mes (infra + IA + storage).
- Revenue por tenant (plan).
- Gross margin target: >70%.

Alerta: si costo de un tenant individual >30% de su MRR → revisar límites.

---

## 11. Performance targets

### 11.1 Backend

| Endpoint class | p50 | p95 | p99 |
|---|---|---|---|
| Auth (login, refresh) | <50ms | <150ms | <300ms |
| CRUD simple (Task create/update) | <80ms | <200ms | <500ms |
| Dashboards | <100ms (cached) | <300ms | <800ms |
| Listados paginados | <60ms | <180ms | <400ms |
| Reportes PDF (async) | <5s | <15s | <30s |
| Resumen IA | <2s | <5s | <10s |

### 11.2 Frontend

- **LCP:** <2.5s en 4G
- **TTFB:** <400ms
- **FID/INP:** <200ms
- **CLS:** <0.1

### 11.3 Realtime

- Broadcast dispatch → delivery: p95 <200ms
- Reconexión tras flap: <3s

---

## 12. Load testing

Herramienta: **k6**. Scripts en `infra/loadtest/`.

### 12.1 Escenarios MVP

1. **Login + dashboard**: 100 usuarios rampeo, sostenido 5 min. Target: p95 <500ms end-to-end.
2. **Kanban en vivo**: 20 usuarios en mismo tablero, 2 moviendo tareas + 18 observando. Verifica broadcast scaling.
3. **Reportes concurrentes**: 10 reportes PDF disparados en 1 min. Verifica queue + Puppeteer.
4. **IA flood**: 50 resúmenes concurrentes. Verifica rate limit + queue backpressure.

Correr semana 15 del roadmap. Documentar baseline; re-ejecutar tras cambios grandes.

### 12.2 Criterios de aceptación MVP

- 500 req/s sostenido en endpoints CRUD con p95 <300ms.
- 3000 conexiones WebSocket simultáneas.
- 0 errores 5xx no relacionados con 429 (rate limit legítimo).
- DB CPU <70% durante el peak.

---

## 13. Checklist cuando algo se pone lento

Orden sugerido:
1. **Observabilidad**: mirar dashboard de API + DB + Queue. Identificar el cuello.
2. **Query análisis**: si DB bottleneck, `EXPLAIN ANALYZE` en la query top. ¿Índice faltante?
3. **Cache**: ¿está cacheada esa query? ¿TTL razonable? ¿Hit rate?
4. **N+1**: tail log de Laravel Telescope (staging). Query count por request.
5. **Serialización**: ¿API Resource carga relaciones innecesarias?
6. **Réplicas lectura**: ¿la query es candidata a read replica?
7. **Escalado horizontal**: último recurso. Añade costo, primero optimiza.

---

## 14. Documentos futuros relacionados

- `docs/runbooks/incident-response.md` — P1/P2 playbooks
- `docs/runbooks/scaling-playbook.md` — checklist al pasar de fase
- `docs/architecture/08-erd.md` — schema completo (FASE 2)
