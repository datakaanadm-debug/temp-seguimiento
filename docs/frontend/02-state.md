# 02 · State management

> Tres capas claramente separadas: **server state** (TanStack Query), **client state** (Zustand), **URL state** (nuqs). Nunca mezclar responsabilidades entre las tres.

---

## 1. Regla de oro

| Tipo de estado | Herramienta | Ejemplos |
|---|---|---|
| Datos que el servidor posee | **TanStack Query** | Tasks, Users, Evaluations |
| UI state efímero | **Zustand** (minimal) | Sidebar collapsed, modal abierto, tab activo |
| Filtros, vista, page, selecciones que viajan por link | **nuqs** (URL) | `?view=kanban&project_id=...&priority=urgent` |
| Form state temporal | **react-hook-form** | Inputs mientras usuario edita |
| Auth state | Cookie httpOnly + Sanctum | Se lee en server, se hidrata en cliente via `useAuth` |

**Señal:** ¿Puedo refrescar la página y que siga igual? Si sí → URL state. ¿Sobrevive a un reboot? → server state. ¿Solo importa mientras estás en la pantalla? → client state.

---

## 2. TanStack Query configuración

```ts
// lib/query-client.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnMount: false,
      retry: (failures, error) => {
        const status = (error as ApiError)?.status
        if (status === 401 || status === 403 || status === 404) return false
        return failures < 2
      },
    },
    mutations: {
      retry: 0,
    },
  },
})
```

### 2.1 Convenciones de `queryKey`

Siempre tuplas descriptivas + params:

```ts
['tasks', { projectId, state }]
['task', taskId]
['notifications', { unread }]
['daily-report', 'today']
['profiles', { kind: 'intern' }]
['evaluations', evaluationId]
```

Helpers centralizados por feature para evitar typos:

```ts
// features/tasks/api/keys.ts
export const taskKeys = {
  all: ['tasks'] as const,
  list: (params: ListParams) => ['tasks', params] as const,
  detail: (id: string) => ['task', id] as const,
  comments: (id: string) => ['task', id, 'comments'] as const,
}
```

### 2.2 Staletime por categoría

| Recurso | staleTime |
|---|---|
| Detalle de Task (activo) | 10s |
| Kanban del proyecto | 10s (+ realtime invalidation) |
| Dashboards | 60s |
| Listados de people | 5 min |
| Notificaciones | 30s + realtime |
| Tenant/branding | 1h |

---

## 3. apiClient

Envoltorio mínimo sobre `fetch` con cookies + XSRF + error normalizado. Vive en `lib/api-client.ts`, NO se usa fetch directo en features.

```ts
// uso
const tasks = await apiClient.get<ListResponse<Task>>('/api/v1/tasks', { searchParams: { project_id: p } })
const created = await apiClient.post<{ data: Task }>('/api/v1/tasks', body)
```

Comportamiento:
- Inyecta `credentials: 'include'` siempre.
- Agrega `X-XSRF-TOKEN` desde cookie si hay sesión.
- 204/200 → devuelve `null`/json parseado.
- 401 → emite evento `auth:unauthorized` (los providers lo escuchan para redirigir a login).
- Otros 4xx/5xx → lanza `ApiError { status, message, errors? }`.
- Funciona en server (RSC) con forward de `cookies()` de Next.

---

## 4. Zustand: UI state efímero

Stores mínimos, **una sola por dominio UI**. Evitar dumping ground.

```ts
// lib/stores/ui-store.ts
type UiState = {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (v: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
}))
```

Persistir a `localStorage` solo lo estable (sidebar collapsed). Nunca datos de servidor.

---

## 5. nuqs: URL state

Ideal para filtros, views, selecciones compartibles:

```tsx
// features/tasks/components/kanban-board.tsx
import { useQueryState, parseAsString, parseAsStringLiteral } from 'nuqs'

export function KanbanBoard() {
  const [view, setView] = useQueryState('view',
    parseAsStringLiteral(['kanban', 'list', 'timeline']).withDefault('kanban'))
  const [priority, setPriority] = useQueryState('priority', parseAsString)
  // ...
}
```

URL canónica: `/tareas?view=kanban&project_id=abc&priority=urgent&mine=1`.

---

## 6. Form state: react-hook-form + zod

Schemas compartidos con backend en `packages/types/schemas/`:

```ts
// features/tasks/components/task-form.tsx
const schema = z.object({
  title: z.string().min(1).max(300),
  priority: z.enum(['urgent', 'high', 'normal', 'low']),
  due_at: z.string().datetime().nullable(),
  assignee_id: z.string().uuid().nullable(),
})

export function TaskForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'normal', due_at: null, assignee_id: null },
  })
  // ...
}
```

Uno puede:
- Usar un solo schema compartido (fuente = frontend).
- O generar Zod desde OpenAPI (overkill para MVP; considerar fase 2).

MVP: schemas por feature, inline. Cambiar a generados cuando sean >10 features.

---

## 7. Realtime sync con TanStack Query

Principio: el server de Reverb no arma estado propio. Envía eventos → el cliente **muta la cache** de TanStack Query.

```ts
// features/tasks/hooks/use-task-realtime.ts
export function useTaskRealtime(projectId: string) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!window.Echo || !projectId) return
    const channel = `tenant.${currentTenantId()}.project.${projectId}`

    window.Echo.private(channel)
      .listen('.task.created', (task: Task) => {
        qc.setQueryData(taskKeys.list({ projectId }), (old?: Task[]) =>
          old && !old.find(t => t.id === task.id) ? [...old, task] : (old ?? [task])
        )
      })
      .listen('.task.updated', (task: Task) => {
        qc.setQueryData(taskKeys.list({ projectId }), (old?: Task[]) =>
          old?.map(t => t.id === task.id ? task : t) ?? []
        )
        qc.setQueryData(taskKeys.detail(task.id), task)
      })
      .listen('.task.state_changed', ({ id, to }: { id: string; to: string }) => {
        qc.setQueryData(taskKeys.list({ projectId }), (old?: Task[]) =>
          old?.map(t => t.id === id ? { ...t, state: to as any } : t) ?? []
        )
      })

    return () => { window.Echo.leave(channel) }
  }, [projectId, qc])
}
```

**Regla:** mutar cache directo, nunca `invalidate` de listas largas. Invalidate solo si el cambio afecta paginación o filtros derivados.

---

## 8. Auth context

La sesión vive en cookies httpOnly de Sanctum. Hidratación:

```ts
// providers/auth-provider.tsx
'use client'
export function AuthProvider({ initialUser, initialTenant, children }: Props) {
  const [user, setUser] = useState(initialUser)
  const [tenant, setTenant] = useState(initialTenant)

  // Listen al evento de apiClient cuando se detecta 401
  useEffect(() => {
    const onUnauthorized = () => { setUser(null); router.push('/login') }
    window.addEventListener('auth:unauthorized', onUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized)
  }, [])

  return (
    <AuthContext.Provider value={{ user, tenant, setUser, setTenant }}>
      {children}
    </AuthContext.Provider>
  )
}
```

El `app/(app)/layout.tsx` hace fetch RSC de `/auth/me` y pasa el user+tenant como `initialUser`/`initialTenant`.

---

## 9. Persistencia y rehidratación

- **TanStack Query cache:** no persiste entre sesiones en MVP. La home vuelve a pedir. Fase 2: `persistQueryClient` con storage selectivo si hace sentido.
- **Zustand persistente:** solo `sidebarCollapsed` y preferencias del usuario que no son de servidor.
- **Form drafts:** `localStorage` por key `draft:form-name:user-id` con TTL 7d (para crear task larga que se interrumpe).

---

## 10. Notifications unread badge

Caso de estudio pequeño pero importante:

```ts
// hooks/use-unread-count.ts
export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => apiClient.get<{ unread_count: number }>('/api/v1/notifications/unread-count'),
    refetchInterval: 60_000,                    // fallback si Reverb cae
    staleTime: 30_000,
  })
}

// hook que muta cache on realtime
export function useUnreadCountRealtime(userId: string) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!window.Echo) return
    window.Echo.private(`user.${userId}`)
      .listen('.notification.received', () => {
        qc.setQueryData(['notifications', 'unread-count'], (old: any) =>
          old ? { unread_count: old.unread_count + 1 } : undefined
        )
      })
    return () => { window.Echo.leave(`user.${userId}`) }
  }, [userId, qc])
}
```

---

## 11. Anti-patrones

1. ❌ `useEffect` que hace fetch directo sin TanStack Query.
2. ❌ Zustand con datos de servidor (tasks, users, etc.).
3. ❌ Estado de filtros en `useState` local (perderás al refrescar).
4. ❌ Invalidar toda una lista cuando solo un item cambió.
5. ❌ Cookies o tokens en estado React.
6. ❌ Subscripciones Reverb fuera de hooks (memory leaks).
