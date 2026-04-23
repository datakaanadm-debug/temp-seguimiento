# 04 · Realtime

> Objetivo: cambios visibles en <200ms p95 para superficies colaborativas (Kanban, comentarios, notificaciones, presencia). Sin CRDT en MVP.

---

## 1. Decisión de stack

**Laravel Reverb** como WebSocket server. Corre como proceso Laravel dedicado con el mismo codebase, conectado a Redis para pub/sub y broadcasting.

Alternativas consideradas y descartadas:

| Opción | Por qué no en MVP |
|---|---|
| Servicio Node dedicado (Fastify + ws) | Codebase extra que mantener con 1 dev; justificado solo si hay CRDT |
| Soketi | Proyecto en pausa, riesgo a mediano plazo |
| Pusher gestionado | ~$49/mes desde 500 conexiones, costo escala rápido |
| Socket.io server | Requiere Node, mismo problema que Fastify |
| Ably / Centrifugo cloud | Costo + vendor lock-in |

**Decisión:** Reverb. Si a >1000 conexiones concurrentes por tenant detectamos problemas, migramos a Node dedicado (diseño preparado, ver sección 10).

---

## 2. Superficies realtime en MVP

| Superficie | Canal | Eventos |
|---|---|---|
| Kanban de tareas | `private-tenant.{tid}.project.{pid}` | `TaskCreated`, `TaskStateChanged`, `TaskUpdated`, `TaskDeleted`, `TaskAssigned` |
| Detalle de tarea | `private-tenant.{tid}.task.{id}` | `TaskCommented`, `TaskUpdated`, `CommentDeleted`, `AttachmentAdded` |
| Notificaciones de usuario | `private-user.{uid}` | `NotificationDispatched`, `NotificationRead` |
| Dashboard líder | `private-tenant.{tid}.team.{team_id}` | `TaskStateChanged`, `BlockerRaised`, `InsightDetected` |
| Presencia (quién mira) | `presence-tenant.{tid}.project.{pid}` | `.joined`, `.leaving`, `here` |

Fuera de MVP: co-edición de texto (CRDT), cursores remotos, canales tipo Slack.

---

## 3. Convención de canales

Formato: `{scope}-{tenant_segment}.{resource}.{id}`

| Tipo | Scope | Uso |
|---|---|---|
| `public-` | público | No usado en MVP (todo requiere auth) |
| `private-` | requiere auth | Default para notificaciones y entidades |
| `presence-` | auth + presencia | Para saber quién está conectado |

**Todos los canales privados arrancan con `tenant.{tenant_id}`.** El authorizer valida que el user pertenece al tenant antes de suscribir. Esto añade una capa extra además de la suscripción HTTP: si el token es de tenant B pero el canal es de tenant A, el broker rechaza.

```php
// routes/channels.php
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('tenant.{tenantId}.project.{projectId}', function ($user, $tenantId, $projectId) {
    if ($user->currentTenant()->id !== $tenantId) {
        return false;
    }
    $project = Project::find($projectId);
    return $project && $user->can('view', $project);
});

Broadcast::channel('tenant.{tenantId}.task.{taskId}', function ($user, $tenantId, $taskId) {
    if ($user->currentTenant()->id !== $tenantId) {
        return false;
    }
    $task = Task::find($taskId);
    return $task && $user->can('view', $task);
});

Broadcast::channel('user.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

Broadcast::channel('tenant.{tenantId}.project.{projectId}.presence', function ($user, $tenantId, $projectId) {
    if ($user->currentTenant()->id !== $tenantId) {
        return false;
    }
    $project = Project::find($projectId);
    if (!$project || !$user->can('view', $project)) {
        return false;
    }

    // Payload de presencia visible a otros en el canal
    return [
        'id' => $user->id,
        'name' => $user->name,
        'avatar_url' => $user->avatar_url,
        'role' => $user->primaryRole(),
    ];
});
```

---

## 4. Broadcasting: de dominio a WebSocket

### 4.1 Patrón

Los eventos de dominio (`TaskCreated`, etc.) **no se emiten directamente por WebSocket.** Un listener traduce el evento de dominio a un "event broadcast" separado. Esto permite:

- Filtrar qué eventos son públicos y cuáles no.
- Cambiar el shape del payload broadcast sin tocar el dominio.
- Si hay que cambiar Reverb por otro broker, se hace sin tocar dominio.

```php
// app/Modules/Tasks/Domain/Events/TaskCreated.php (dominio puro)
final class TaskCreated
{
    public function __construct(public Task $task) {}
}

// app/Modules/Tasks/Infrastructure/Broadcasting/BroadcastTaskCreated.php
final class BroadcastTaskCreated implements ShouldQueue
{
    public string $queue = 'broadcasting';

    public function handle(TaskCreated $event): void
    {
        $task = $event->task;

        broadcast(new TaskBroadcast(
            channel: "tenant.{$task->tenant_id}.project.{$task->project_id}",
            event: 'task.created',
            payload: TaskResource::make($task)->resolve(),
        ))->toOthers();
    }
}

// app/Shared/Broadcasting/TaskBroadcast.php
class TaskBroadcast implements ShouldBroadcast
{
    public function __construct(
        public string $channel,
        public string $event,
        public array $payload,
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel($this->channel);
    }

    public function broadcastAs(): string
    {
        return $this->event;
    }

    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
```

**`->toOthers()`** excluye al socket que disparó el cambio, porque la UI ya hizo optimistic update.

### 4.2 Mapeo dominio ↔ broadcast

| Evento dominio | Canal | Evento broadcast | Payload |
|---|---|---|---|
| `TaskCreated` | `tenant.{t}.project.{p}` | `task.created` | Task completa |
| `TaskStateChanged` | `tenant.{t}.project.{p}` | `task.state_changed` | `{ id, from, to, actor_id }` |
| `TaskUpdated` | `tenant.{t}.project.{p}`, `tenant.{t}.task.{id}` | `task.updated` | Task completa |
| `TaskAssigned` | `tenant.{t}.project.{p}`, `tenant.{t}.task.{id}`, `user.{assignee}` | `task.assigned` | `{ task_id, assignee_id, by }` |
| `TaskCommented` | `tenant.{t}.task.{id}` | `comment.created` | Comment + autor |
| `NotificationDispatched` | `user.{uid}` | `notification.received` | Notification |
| `BlockerRaised` | `tenant.{t}.team.{team}` | `blocker.raised` | `{ task_id, reason, actor }` |

---

## 5. Cliente web (Next.js)

### 5.1 Setup

```ts
// apps/web/lib/realtime/echo.ts
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
  interface Window { Pusher: typeof Pusher; Echo: Echo }
}

export function initEcho(tenantSlug: string) {
  if (typeof window === 'undefined') return null;
  window.Pusher = Pusher;

  window.Echo = new Echo({
    broadcaster: 'reverb',
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY!,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST!,
    wsPort: 443,
    wssPort: 443,
    forceTLS: true,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `https://api.interna.app/api/v1/broadcasting/auth`,
    auth: {
      withCredentials: true,  // cookies Sanctum
    },
  });

  return window.Echo;
}
```

### 5.2 Hook de suscripción

```ts
// apps/web/hooks/useRealtimeChannel.ts
export function useRealtimeChannel<T>(
  channel: string,
  event: string,
  handler: (payload: T) => void,
) {
  useEffect(() => {
    if (!window.Echo) return;

    const sub = window.Echo.private(channel).listen(`.${event}`, handler);

    return () => {
      window.Echo.leave(channel);
    };
  }, [channel, event]);
}
```

### 5.3 Integración con TanStack Query

```ts
// apps/web/features/tasks/hooks/useProjectBoardRealtime.ts
export function useProjectBoardRealtime(tenantId: string, projectId: string) {
  const qc = useQueryClient();
  const channel = `tenant.${tenantId}.project.${projectId}`;

  useRealtimeChannel<Task>(channel, 'task.created', (task) => {
    qc.setQueryData<Task[]>(['tasks', projectId], (old) => {
      if (!old) return [task];
      if (old.some(t => t.id === task.id)) return old;
      return [...old, task];
    });
  });

  useRealtimeChannel<{ id: string; to: string }>(channel, 'task.state_changed', ({ id, to }) => {
    qc.setQueryData<Task[]>(['tasks', projectId], (old) =>
      old?.map(t => t.id === id ? { ...t, state: to } : t) ?? []
    );
  });

  useRealtimeChannel<Task>(channel, 'task.updated', (task) => {
    qc.setQueryData<Task[]>(['tasks', projectId], (old) =>
      old?.map(t => t.id === task.id ? task : t) ?? []
    );
  });
}
```

**Principio:** mutar el cache de TanStack Query directamente, NO invalidar + refetch. Invalidar dispara N requests si varios eventos llegan seguidos.

### 5.4 Presencia

```ts
export function useProjectPresence(tenantId: string, projectId: string) {
  const [members, setMembers] = useState<PresenceMember[]>([]);

  useEffect(() => {
    if (!window.Echo) return;

    const channel = window.Echo.join(`tenant.${tenantId}.project.${projectId}.presence`)
      .here((users: PresenceMember[]) => setMembers(users))
      .joining((u: PresenceMember) => setMembers((p) => [...p, u]))
      .leaving((u: PresenceMember) => setMembers((p) => p.filter(m => m.id !== u.id)));

    return () => {
      window.Echo.leave(`tenant.${tenantId}.project.${projectId}.presence`);
    };
  }, [tenantId, projectId]);

  return members;
}
```

Componente `<AvatarBar members={members} />` en el header del proyecto muestra quién está viéndolo.

---

## 6. Reconexión y resiliencia

### 6.1 Estrategia cliente

Pusher.js (subyacente de laravel-echo) ya trae reconnect con exponential backoff. Configuración defecto es suficiente pero hay que manejar:

- **Indicador visual:** dot verde/amarillo/rojo en la UI.
- **Backfill tras reconectar:** si estuvimos offline >5s, **invalidar queries afectadas** para resync completo. Los eventos perdidos durante offline no se replayan; preferimos refetch.

```ts
useEffect(() => {
  if (!window.Echo) return;
  const connector = window.Echo.connector.pusher.connection;

  connector.bind('connected', () => setStatus('connected'));
  connector.bind('disconnected', () => setStatus('offline'));
  connector.bind('reconnected', () => {
    setStatus('connected');
    // Invalidar queries que dependen de realtime
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['notifications'] });
  });
}, []);
```

### 6.2 Fallback a polling (no SSE en MVP)

Si WebSocket falla 3 veces seguidas (red corporativa bloqueando), degradar a polling cada 15s en las queries críticas con `refetchInterval`. Este es un fallback de emergencia, no el default.

SSE se descartó porque Laravel Reverb ya incluye long-polling fallback nativo con Pusher protocol.

---

## 7. Escalado horizontal

### 7.1 MVP (1 instancia Reverb)

- Hasta ~5000 conexiones concurrentes en un proceso Reverb single-box.
- Broadcasting via Redis: API/worker emite → Redis pub/sub → Reverb distribuye a sockets suscritos.
- Sin sticky sessions necesarias: cada cliente persiste su conexión a la única instancia.

### 7.2 Escalado (cuando pasemos ~3000 conexiones sostenidas)

- **N instancias Reverb detrás de LB con sticky sessions** (IP hash o cookie).
- Redis pub/sub ya es el backbone: las instancias se hablan entre sí vía Redis, no directamente.
- Límite suave: ~25k conexiones por proceso (testeado por comunidad Laravel).

### 7.3 Escalado (>25k conexiones o con CRDT en fase 2)

- Migrar a servicio Node dedicado (Fastify + uWebSockets.js + Yjs).
- Codebase nuevo en `apps/realtime/`.
- API Laravel mantiene `Broadcasting` igual, solo cambia el driver.
- ETA de migración: ~2-3 semanas si se prepara bien el dominio de Broadcasting como está hoy (abstraído detrás de `ShouldBroadcast`).

---

## 8. Configuración Reverb producción

```env
BROADCAST_CONNECTION=reverb

REVERB_APP_ID=interna-prod
REVERB_APP_KEY=<generado>
REVERB_APP_SECRET=<generado>
REVERB_HOST=reverb.interna.app
REVERB_PORT=8080                 # interno tras LB
REVERB_SCHEME=https
REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=8080

# Escalado
REVERB_SCALING_ENABLED=true
REVERB_SCALING_CHANNEL=reverb-scaling
REDIS_HOST=<managed>
REDIS_PORT=6379
REDIS_PASSWORD=<doppler>

# TLS terminado en Railway / Cloudflare
```

En Railway: servicio separado `reverb`, Dockerfile `infra/docker/reverb.Dockerfile` con `CMD ["php", "artisan", "reverb:start", "--host=0.0.0.0", "--port=8080"]`.

Limits de proceso:
- Memoria: 512MB por instancia inicial (escala si hace falta).
- CPU: 1 vCPU.
- Healthcheck HTTP en `/health` expuesto por un controller Laravel simple.

---

## 9. Métricas y observabilidad

| Métrica | Objetivo | Alarma |
|---|---|---|
| Conexiones concurrentes | n/a | >3000 por instancia → escalar |
| Broadcasts/sec | n/a | >500/sec por tenant → investigar loop |
| Auth failures | <0.5% | >5% → revisar tokens |
| Latencia broadcast (dispatch → delivery) | p95 <200ms | >500ms → investigar Redis |
| Errores conexión | <1% | >5% → incidente |
| CPU instancia | <70% | >85% sostenido 5min → escalar |

Reverb expone `/stats` endpoint (proteger con auth básica en LB). Scraping con OpenTelemetry.

---

## 10. Plan de migración a servicio Node dedicado (fase 2)

Para referencia futura, sin implementar ahora:

1. Nuevo package `apps/realtime/` con Fastify + `ws` + Yjs.
2. Autenticación: verificar Sanctum cookie contra endpoint `/api/v1/broadcasting/verify` (sin session write).
3. Canales idénticos, protocolo puede ser Pusher-compatible o custom.
4. Laravel API cambia driver: de `reverb` a HTTP webhook a `apps/realtime/` cuando emite broadcasts.
5. Migración gradual: tenants en canary primero.

---

## 11. Límites del diseño actual (conscientes)

- **No guaranteed delivery.** Si cliente está offline cuando se dispara un broadcast, lo pierde. Acceptable para UX (el estado real está en Postgres; el cliente refetchea al reconectar).
- **No CRDT.** Dos usuarios editando la misma descripción de tarea → última escritura gana. Documentar en UI con toast "Carlos actualizó esta tarea, refrescando..." con un "guardar de todos modos".
- **No cross-tenant channels.** Por diseño. Si un dominio eventual lo requiere (fase 2 marketplace entre tenants), diseño aparte.

---

## 12. Checklist para añadir superficie realtime

- [ ] Definir canal con prefijo `tenant.{tid}.` + resource.
- [ ] Autorizer en `routes/channels.php` valida tenant + permiso sobre recurso.
- [ ] Evento de dominio existente (no crear ad hoc para broadcast).
- [ ] Listener `BroadcastX` en `Infrastructure/Broadcasting/`.
- [ ] Payload es un Resource existente o un DTO simple (NO el modelo crudo).
- [ ] Hook React consume y actualiza TanStack Query cache (no invalidate).
- [ ] Presencia si colaborativo visible (`presence-` channel).
- [ ] Test feature que verifica broadcast se dispara en el evento correcto.
