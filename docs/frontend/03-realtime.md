# 03 · Realtime cliente

> Consumidor de Laravel Reverb vía `laravel-echo` + `pusher-js`. Autenticación con cookies Sanctum. Subscripciones managed por hooks (no singletons).

---

## 1. Setup

```ts
// lib/realtime/echo.ts
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

let initialized = false

export function initEcho() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  ;(window as any).Pusher = Pusher

  ;(window as any).Echo = new Echo({
    broadcaster: 'reverb',
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY!,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST!,
    wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 443),
    wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 443),
    forceTLS: (process.env.NEXT_PUBLIC_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${process.env.NEXT_PUBLIC_API_URL}/api/v1/broadcasting/auth`,
    auth: { withCredentials: true },
  })
}

export function getEcho() {
  return (window as any).Echo as Echo | undefined
}
```

El `RealtimeProvider` llama `initEcho()` en un `useEffect` al montar, una sola vez.

---

## 2. Autenticación

Reverb Pusher protocol hace `POST /broadcasting/auth` con el nombre del canal y socket id. Sanctum stateful cookie basta — el backend valida el canal contra `routes/channels.php` (ver backend doc 04-realtime.md).

Cross-subdomain: `wss://api.interna.app` con `withCredentials: true` envía la cookie de `.interna.app`.

---

## 3. Convenciones de canales

Cliente usa los mismos nombres definidos en backend:

| Canal | Uso |
|---|---|
| `private-tenant.{tid}.project.{pid}` | Kanban live |
| `private-tenant.{tid}.task.{id}` | Detalle live (comments, attachments) |
| `private-user.{uid}` | Notifications del user |
| `private-tenant.{tid}.team.{team_id}` | Dashboard líder |
| `presence-tenant.{tid}.project.{pid}` | Avatars de quién ve el tablero |

---

## 4. Hooks de suscripción

`useRealtimeChannel` es el building block base:

```ts
// hooks/use-realtime-channel.ts
export function useRealtimeChannel<T>(
  channel: string | null,
  event: string,
  handler: (payload: T) => void,
  deps: unknown[] = [],
) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!channel) return
    const echo = getEcho()
    if (!echo) return

    const sub = echo.private(channel).listen(`.${event}`, (p: T) => handlerRef.current(p))
    return () => { echo.leave(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, event, ...deps])
}
```

Hooks derivados por feature:

```ts
// features/tasks/hooks/use-task-realtime.ts
export function useTaskRealtime(projectId?: string) {
  const qc = useQueryClient()
  const tenantId = useTenant().id
  const channel = projectId ? `tenant.${tenantId}.project.${projectId}` : null

  useRealtimeChannel<Task>(channel, 'task.created', (t) => {
    qc.setQueryData(taskKeys.list({ projectId }), (old?: Task[]) =>
      old && !old.find(x => x.id === t.id) ? [...old, t] : (old ?? [t]))
  })

  useRealtimeChannel<Task>(channel, 'task.updated', (t) => {
    qc.setQueryData(taskKeys.detail(t.id), t)
    qc.setQueryData(taskKeys.list({ projectId }), (old?: Task[]) =>
      old?.map(x => x.id === t.id ? t : x) ?? [])
  })

  useRealtimeChannel<StateChangedPayload>(channel, 'task.state_changed', ({ id, to }) => {
    qc.setQueryData(taskKeys.list({ projectId }), (old?: Task[]) =>
      old?.map(x => x.id === id ? { ...x, state: to } : x) ?? [])
  })
}
```

---

## 5. Presence (avatar bar)

```ts
export function useProjectPresence(projectId: string) {
  const [members, setMembers] = useState<PresenceMember[]>([])
  const tenantId = useTenant().id

  useEffect(() => {
    const echo = getEcho()
    if (!echo || !projectId) return
    const channel = `tenant.${tenantId}.project.${projectId}.presence`

    echo.join(channel)
      .here((users: PresenceMember[]) => setMembers(users))
      .joining((u: PresenceMember) => setMembers((p) => [...p, u]))
      .leaving((u: PresenceMember) => setMembers((p) => p.filter(m => m.id !== u.id)))

    return () => { echo.leave(channel) }
  }, [projectId, tenantId])

  return members
}
```

Componente `<AvatarBar members={members} />` en el header del proyecto.

---

## 6. Reconexión

Pusher.js reconnect nativo con exponential backoff. Manejamos los estados para UX:

```ts
// hooks/use-connection-status.ts
type Status = 'connecting' | 'connected' | 'unavailable' | 'failed'

export function useConnectionStatus(): Status {
  const [status, setStatus] = useState<Status>('connecting')

  useEffect(() => {
    const echo = getEcho()
    if (!echo) return
    const connector = (echo.connector as any).pusher.connection

    connector.bind('state_change', ({ current }: any) => setStatus(current))
    return () => connector.unbind('state_change')
  }, [])

  return status
}
```

Indicador visual en topbar:
- `connected` → dot verde.
- `connecting`/`unavailable` → dot amarillo "Reconectando...".
- `failed` → dot rojo "Sin conexión — usando datos locales".

---

## 7. Backfill tras reconectar

Cuando la conexión vuelve tras un gap >5s, invalidamos queries afectadas:

```ts
useEffect(() => {
  const echo = getEcho()
  if (!echo) return
  let lastDisconnect = 0

  const connector = (echo.connector as any).pusher.connection
  connector.bind('disconnected', () => { lastDisconnect = Date.now() })
  connector.bind('connected', () => {
    const gap = Date.now() - lastDisconnect
    if (gap > 5_000) {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    }
  })
}, [qc])
```

Este listener vive en el `RealtimeProvider` root, no por feature.

---

## 8. Fallback polling

Si Reverb no se conecta (red corporativa bloquea WS), las queries críticas degradan a polling suave:

```ts
useQuery({
  queryKey: ['notifications'],
  refetchInterval: connectionStatus !== 'connected' ? 15_000 : false,
})
```

---

## 9. Layout típico en un feature

```
features/tasks/
├── hooks/
│   ├── use-task-realtime.ts          ← subs a task.* eventos
│   ├── use-project-presence.ts       ← presence
│   └── ...
└── components/
    └── kanban-board.tsx
        ↓ dentro del componente:
          useTasks({ projectId })       // fetch inicial
          useTaskRealtime(projectId)    // subs a cambios
          useProjectPresence(projectId) // avatares
```

---

## 10. Performance considerations

- **Una sub por channel**, no una por componente. El hook `useRealtimeChannel` ya deduplica porque Echo reutiliza canales.
- **`.listen('.evento')`** con el punto inicial es lo que espera Pusher protocol para eventos custom.
- **Mutar cache directamente** evita cascadas de `invalidate` que disparan N refetches.
- **`useRef` para handlers** evita reconectar el canal en cada render.

---

## 11. Debugging

Logs útiles en consola:

```ts
// solo en dev
if (process.env.NODE_ENV === 'development') {
  Pusher.log = (msg) => console.log('[pusher]', msg)
}
```

Ver en DevTools Network → WS → mensajes entrantes.

---

## 12. Anti-patrones

1. ❌ `useEffect(() => echo.private(...).listen(...))` sin cleanup → leak.
2. ❌ Usar el mismo canal en N componentes sin coordinar → duplica listeners.
3. ❌ Pasar `handler` directo sin `useRef` → reconecta el canal en cada render.
4. ❌ Invalidar toda la query al recibir un evento → desperdicia fetch.
5. ❌ Asumir que los eventos llegan en orden → el server puede reordenar bajo carga.
