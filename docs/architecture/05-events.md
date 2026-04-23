# 05 · Event-driven architecture

> Los eventos son el pegamento entre módulos. Reglas claras sobre cuándo emitir, cómo consumir, y qué hacer cuando falla.

---

## 1. Filosofía

**Postgres es fuente de verdad. Los eventos orquestan reacciones.**

No es event sourcing. No reconstruimos estado desde la bitácora de eventos. Los eventos son para:
1. **Desacoplar** módulos: `Tasks` emite `TaskCreated` y se desentiende; `Notifications`, `Analytics`, `AI` reaccionan por separado.
2. **Trabajo async**: mover carga fuera del request ciclo (envío de emails, generación de PDFs, llamadas IA).
3. **Auditoría**: registro inmutable de qué pasó (audit_log).
4. **Broadcasting realtime** (ver doc 04).

---

## 2. Tres categorías de eventos

| Categoría | Ejemplo | Forma |
|---|---|---|
| **Domain events** | `TaskCreated`, `EvaluationSubmitted` | Clase PHP plana, propiedades readonly |
| **Integration events** | Eventos emitidos a webhooks externos (fase 2) | Serialización JSON + HMAC signature |
| **System events** | `UserLoggedIn`, `RateLimitExceeded` | Laravel built-ins |

Este doc cubre principalmente domain events.

---

## 3. Convención de nombres

- **Pasado** perfecto: `TaskCreated`, no `CreateTask`.
- Subject + verbo: `{Entity}{Action}`.
- Granulares: `TaskStateChanged` mejor que `TaskUpdated` genérico (que igual existe como fallback).
- PHP namespace: `App\Modules\{Module}\Domain\Events\{EventName}`.

```php
namespace App\Modules\Tasks\Domain\Events;

final class TaskCreated
{
    public function __construct(
        public readonly Task $task,
        public readonly User $actor,
        public readonly \DateTimeImmutable $occurredAt = new \DateTimeImmutable(),
    ) {}
}
```

---

## 4. Catálogo de eventos MVP

| Módulo | Evento | Payload | Consumidores |
|---|---|---|---|
| Identity | `TenantCreated` | Tenant | Seeders, Analytics, Billing |
| Identity | `UserInvited` | Invitation, actor | Notifications (email) |
| Identity | `UserActivated` | User, Tenant | Notifications, Analytics |
| Identity | `UserLoggedIn` | User, IP, UA | AuditLog, Analytics |
| Organization | `TeamCreated` | Team | AuditLog |
| Organization | `MembershipChanged` | Membership, from, to | Notifications, AuditLog |
| People | `InternAssigned` | Intern, Mentor | Notifications, AuditLog |
| People | `ProfileUpdated` | Profile, changes | AuditLog, Realtime |
| Tasks | `TaskCreated` | Task, actor | Notifications, Realtime, Search index, AuditLog |
| Tasks | `TaskStateChanged` | Task, from, to, actor | Notifications (if review/done), Realtime, Analytics, AI |
| Tasks | `TaskAssigned` | Task, assignee, actor | Notifications, Realtime |
| Tasks | `TaskCommented` | Task, comment, actor | Notifications (mentions), Realtime |
| Tasks | `TaskBlocked` | Task, reason, actor | Notifications (lead), AI (insight candidate) |
| Tasks | `TaskDueSoon` | Task (warning T-24h) | Notifications (assignee) |
| Tasks | `TaskOverdue` | Task | Notifications (assignee, lead), AI |
| Tracking | `DailyReportSubmitted` | DailyReport | AI (summary), Notifications (lead) |
| Tracking | `BlockerRaised` | Blocker | Notifications, Realtime |
| Performance | `EvaluationScheduled` | Evaluation | Notifications (involved) |
| Performance | `EvaluationSubmitted` | Evaluation | Notifications, Analytics, AI |
| Performance | `EvaluationSigned` | Evaluation, signer | Notifications, AuditLog |
| Reports | `ReportGenerated` | ReportRun | Notifications (requester) |
| AI | `SummaryGenerated` | AiSummary | Realtime (panel update) |
| AI | `RiskInsightDetected` | AiInsight | Notifications (lead, HR), Dashboard |

---

## 5. Dispatch: cuándo y cómo

### 5.1 Post-commit dispatch (obligatorio para cambios de datos)

Los eventos se disparan **después** del commit de la transacción, no antes. Si la tx falla, los eventos no se emiten.

```php
// app/Modules/Tasks/Application/Commands/CreateTaskHandler.php
class CreateTaskHandler
{
    public function handle(CreateTask $cmd): Task
    {
        return DB::transaction(function () use ($cmd) {
            $task = Task::create([
                'tenant_id' => app(Tenant::class)->id,
                'project_id' => $cmd->projectId,
                'title' => $cmd->title,
                'assignee_id' => $cmd->assigneeId,
                'priority' => $cmd->priority,
                'due_at' => $cmd->dueAt,
                'state' => 'TO_DO',
                'created_by' => $cmd->actor->id,
            ]);

            // Dispatch post-commit con Event::dispatchAfterCommit
            // Alternativa: usar $model->dispatchesEvents con events de Eloquent
            DB::afterCommit(function () use ($task, $cmd) {
                event(new TaskCreated($task, $cmd->actor));
            });

            return $task;
        });
    }
}
```

Regla: **nunca** `event(new ...)` dentro de la tx sin `DB::afterCommit`. Si hay listeners síncronos que escriben a DB, podrían dejar datos huérfanos si la tx rollback.

### 5.2 Dispatch desde modelos (casos simples)

Para cambios triviales, `$dispatchesEvents` en el modelo:

```php
class Task extends Model
{
    use BelongsToTenant;

    protected $dispatchesEvents = [
        'created' => TaskCreated::class,   // Laravel dispara después del save
        'updated' => TaskUpdated::class,
        'deleted' => TaskDeleted::class,
    ];
}
```

**Limitación:** el constructor del evento solo recibe el modelo (`new TaskCreated($task)`). Si necesitas más contexto (actor, razón), usa dispatch explícito como en 5.1.

---

## 6. Listeners: síncronos vs. async

| Listener | Sync o async | Criterio |
|---|---|---|
| Auditoría (`ActivityLog::log`) | **Sync** | Debe registrar en la misma tx lógicamente |
| Broadcasting (`BroadcastTaskCreated`) | **Async** (queue `broadcasting`) | No bloquear response |
| Envío de emails (`SendTaskAssignedEmail`) | **Async** (queue `notifications`) | I/O externo, lento |
| Indexado de búsqueda | **Async** (queue `search`) | Costo CPU |
| IA (resumen, insight) | **Async** (queue `ai`) | Caro, lento, sujeto a rate limit |
| Analytics (event → DWH) | **Async** (queue `analytics`) | Batch-friendly |

Sync debe ser **rápido y confiable** (log local, no red). Todo lo demás, async.

### 6.1 Declarar listener async

```php
final class BroadcastTaskCreated implements ShouldQueue
{
    use InteractsWithQueue;

    public string $connection = 'redis';
    public string $queue = 'broadcasting';
    public int $tries = 3;
    public int $backoff = 5;          // 5s, 10s, 20s
    public int $timeout = 30;

    public function handle(TaskCreated $event): void
    {
        // ...
    }

    public function failed(TaskCreated $event, \Throwable $e): void
    {
        report($e);
        // Opcional: notificar al admin, no al usuario (evitar spam)
    }
}
```

### 6.2 Registro

En `app/Providers/EventServiceProvider.php` solo como mapa; la preferencia es **listeners auto-discovery** (Laravel 11+) por convención de carpetas:

```
app/Modules/Tasks/Infrastructure/Listeners/
  ├── AuditTaskCreated.php
  ├── BroadcastTaskCreated.php
  ├── IndexTaskForSearch.php
  └── NotifyAssignee.php
```

Cada clase listener declara el evento como parámetro de `handle(TaskCreated $e)`. Laravel los descubre automáticamente.

---

## 7. Idempotencia

**Regla:** todo listener async debe ser idempotente. Razones:
- Horizon puede re-intentar jobs por timeout.
- Broadcast puede dispararse dos veces si hay retry.
- Webhooks externos (fase 2) exigen at-least-once.

### 7.1 Estrategias

1. **Checks antes de escribir.** Antes de insertar una notificación, verificar si existe con la misma `subject_id + event + user_id`.
2. **UPSERT.** `insertOrIgnore`, `updateOrCreate` con claves naturales.
3. **Tabla de idempotencia.** Para jobs críticos (cobros, integraciones externas), tabla `processed_events (event_id UUID UNIQUE, handler VARCHAR, processed_at)`. Antes de procesar, verificar; después, insertar.

```php
// app/Shared/Idempotency/ProcessedEvent.php
class ProcessedEvent
{
    public static function guard(string $eventId, string $handler, Closure $do): void
    {
        $exists = DB::table('processed_events')
            ->where(['event_id' => $eventId, 'handler' => $handler])
            ->exists();

        if ($exists) {
            return;
        }

        DB::transaction(function () use ($eventId, $handler, $do) {
            DB::table('processed_events')->insert([
                'event_id' => $eventId,
                'handler' => $handler,
                'processed_at' => now(),
            ]);
            $do();
        });
    }
}
```

Todo evento genera un `id` UUID al construirse para soportar esto:

```php
abstract class DomainEvent
{
    public readonly string $id;
    public readonly \DateTimeImmutable $occurredAt;

    public function __construct()
    {
        $this->id = (string) Str::uuid7();
        $this->occurredAt = new \DateTimeImmutable();
    }
}

final class TaskCreated extends DomainEvent
{
    public function __construct(
        public readonly Task $task,
        public readonly User $actor,
    ) {
        parent::__construct();
    }
}
```

---

## 8. Jobs: reglas de calidad

### 8.1 Timeouts y reintentos

| Tipo job | tries | backoff | timeout |
|---|---|---|---|
| Broadcasting | 3 | 5, 10, 20s | 30s |
| Email (Resend) | 5 | 10, 30, 60, 300, 900s | 60s |
| IA (Claude) | 3 | 5, 30, 120s | 120s |
| PDF report | 2 | 60, 300s | 180s |
| Search index | 3 | 5, 30, 60s | 30s |

### 8.2 Dead letter queue

Jobs que fallan todos los retries van a `failed_jobs` (tabla Laravel) y, además, a Sentry con contexto completo. Horizon UI permite re-ejecutar uno a uno.

Revisión de failed jobs: alerta si >10 failures/hora por cola → investigar.

### 8.3 Serialización de modelos

Eloquent `SerializesModels` es el default. **Problema:** el modelo se serializa como clave y se recarga al ejecutar; si el modelo fue eliminado entre dispatch y run, el job falla.

Para jobs críticos, **pasar solo IDs** y recargar explícitamente:

```php
class GenerateDailyReportSummary implements ShouldQueue
{
    public function __construct(public string $reportId) {}

    public function handle(): void
    {
        $report = DailyReport::find($this->reportId);
        if (!$report) {
            $this->fail(new \RuntimeException("DailyReport {$this->reportId} not found"));
            return;
        }
        // ...
    }
}
```

### 8.4 Contexto tenant en jobs

Ya cubierto en `02-multi-tenancy.md` sección 6. Todo job que toca datos de tenant debe envolverse en `TenantContext::run($tenantId, fn() => ...)`.

---

## 9. Cron jobs y eventos programados

Laravel Scheduler (`app/Console/Kernel.php`) dispara eventos programados. En Railway corre como servicio separado `scheduler` con `CMD ["php", "artisan", "schedule:work"]`.

### 9.1 Programación MVP

```php
protected function schedule(Schedule $schedule): void
{
    // Cada 5 min: check de tareas vencidas o a punto
    $schedule->job(new DetectOverdueTasks())
        ->everyFiveMinutes()
        ->withoutOverlapping()
        ->onQueue('scheduled');

    // Cada hora: warming de cache de dashboards de líderes activos
    $schedule->job(new WarmLeaderDashboards())
        ->hourly()
        ->onQueue('scheduled');

    // Todos los días 8 AM LATAM: email de resumen para líderes
    $schedule->job(new SendDailyLeaderDigest())
        ->dailyAt('13:00')  // UTC
        ->onQueue('scheduled');

    // Todos los viernes 5 PM: resumen semanal IA
    $schedule->job(new GenerateWeeklyAiSummary())
        ->weeklyOn(5, '22:00')
        ->onQueue('ai');

    // Mensual día 1: anonimización de users con soft delete >90d
    $schedule->job(new AnonymizeDeletedUsers())
        ->monthlyOn(1, '03:00');

    // Semanal: limpieza de failed_jobs >30d
    $schedule->command('horizon:clear')->weekly();
}
```

### 9.2 Tenant-aware scheduled jobs

Jobs que corren por tenant (ej. resumen semanal IA) iteran tenants activos:

```php
class GenerateWeeklyAiSummary
{
    public function handle(): void
    {
        Tenant::query()
            ->where('status', 'active')
            ->where('settings->ai_enabled', true)
            ->chunkById(50, function ($tenants) {
                foreach ($tenants as $tenant) {
                    TenantWeeklySummary::dispatch($tenant->id)
                        ->onQueue("tenant-{$tenant->id}:ai");
                }
            });
    }
}
```

Esto evita que un tenant con 1000 practicantes bloquee al resto.

---

## 10. Observabilidad de eventos

### 10.1 Métricas

- `events_dispatched_total{module, event}` — contador
- `events_processing_duration_seconds{listener}` — histograma
- `events_failed_total{listener, error_class}` — contador
- `queue_depth{queue}` — gauge
- `queue_wait_time_seconds{queue}` — histograma

Grafana dashboard: cola por cola, latencia p95, errores/min.

### 10.2 Logs

Cada `event()` genera log INFO con `event_id, event_name, tenant_id, subject_id, actor_id`.
Cada listener en `handle()` genera log INFO al empezar y al terminar con duración. Error si lanza.

### 10.3 Traces

OTel propaga `trace_id` de request a eventos sync. Para jobs async, se inyecta el `trace_id` en el payload del job para continuar el trace en el worker (no es transparente; requiere middleware de Horizon).

---

## 11. Anti-patrones a evitar

1. ❌ **Emitir eventos sync que escriben a BD sin tx.** Rollback de request = datos huérfanos.
2. ❌ **Listener sync con I/O externo (email, HTTP).** Bloquea la response. Mover a async.
3. ❌ **Evento con payload gigante** (ej. Task con todas las relaciones eager). Pasar IDs y cargar en listener.
4. ❌ **Cascadas de eventos** (listener emite evento que dispara otro listener que emite otro...). Máximo 1 salto encadenado.
5. ❌ **Listeners que conocen detalles de otro módulo.** Solo deben leer/consumir vía su API pública.
6. ❌ **Async listeners sin idempotencia.** Al retry, duplicas notificaciones.

---

## 12. Ejemplo end-to-end: practicante crea comentario

```
Usuario comenta en tarea
  ↓
POST /api/v1/tasks/{id}/comments
  ↓ Controller → CreateCommentHandler
DB::transaction {
  Comment::create(...);
  event(new TaskCommented($task, $comment, $user));  // afterCommit
}
  ↓ afterCommit
TaskCommented dispatched
  ↓
Listeners (descubiertos):
  1. AuditTaskCommented (sync)
     → inserta activity_log
  2. BroadcastTaskCommented (async 'broadcasting')
     → Reverb → clientes en tenant.{t}.task.{id}
  3. NotifyMentions (async 'notifications')
     → parsea texto, encuentra @ana @luis
     → para cada mencionado:
        Notification::create(...) (idempotente por subject+user+event)
        event(new NotificationDispatched(...))
     → NotificationDispatched dispara:
        - BroadcastNotification (async)
        - SendNotificationEmail (async, respeta preferencias)
  4. IndexCommentForSearch (async 'search')
     → actualiza índice de comentarios del task
```

Tiempo de respuesta al usuario: ~50-100ms (solo insert + commit). Todo lo demás ocurre asíncrono en <5s.

---

## 13. Checklist para añadir un evento

- [ ] Nombre en pasado perfecto, granular.
- [ ] Clase en `Domain/Events/` del módulo emisor.
- [ ] Extiende `DomainEvent` (con `id` y `occurredAt`).
- [ ] Payload: solo datos/IDs, nunca servicios inyectados.
- [ ] Dispatch con `DB::afterCommit` si emite tras mutación.
- [ ] Listeners en `Infrastructure/Listeners/` del módulo consumidor.
- [ ] Cada listener async declara `$queue`, `$tries`, `$backoff`, `$timeout`.
- [ ] Listener async usa `TenantContext::run` si accede a datos de tenant.
- [ ] Idempotencia garantizada (check previo, upsert, o `ProcessedEvent::guard`).
- [ ] Test unit del handler emisor que verifica evento se dispatcha.
- [ ] Test feature end-to-end para al menos un listener crítico.
