# 01 · Frontend architecture

> Web app Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui. Consume la API Laravel vía REST `/api/v1`, tipos generados desde OpenAPI, realtime vía Laravel Reverb (Pusher protocol).

---

## 1. Principios

1. **Feature-based, no layer-based.** Cada feature (`tasks`, `people`, `reports`, ...) es una carpeta autónoma con su UI, hooks, tipos y data fetching. Las `app/` pages son thin shells que importan features.
2. **Server Components por defecto.** Client Components solo donde hay interacción real (drag, input, timer). RSC baja bundle y tiene TTFB predecible.
3. **Tipos desde OpenAPI.** `packages/types` genera `generated.ts` desde `docs/api/openapi.yaml` (salida de `dedoc/scramble`). Zero drift frontend↔backend.
4. **Optimistic updates obligatorios** en acciones del día a día (mover task, toggle checkbox, comment, mark read).
5. **Realtime es invalidación, no source of truth.** Un evento Reverb muta cache de TanStack Query o fuerza refetch; nunca arma estado propio.
6. **Tokens CSS theme-ables por tenant.** Design tokens en CSS variables; `/api/v1/tenant/theme.css` servirá overrides por tenant (fase 2).
7. **URL es estado.** Filtros, vistas, paginación en query string (`nuqs`). Compartible por link. No hay estado cliente persistido invisible.

---

## 2. Estructura del monorepo

```
seguimiento-backend/                       (workspace raíz)
├── services/api/                          Laravel 12
├── apps/
│   └── web/                               Next.js 15
│       ├── src/
│       │   ├── app/                       App Router (thin pages)
│       │   ├── features/                  módulos de UI
│       │   │   ├── auth/
│       │   │   ├── tasks/
│       │   │   ├── people/
│       │   │   ├── tracking/
│       │   │   ├── performance/
│       │   │   ├── reports/
│       │   │   ├── notifications/
│       │   │   └── ai/
│       │   ├── components/
│       │   │   ├── ui/                    shadcn primitives
│       │   │   └── shared/                dominio (TaskCard, PersonRow, ...)
│       │   ├── lib/                       api client, auth, realtime, utils
│       │   ├── hooks/                     reusables cross-feature
│       │   ├── providers/                 QueryClientProvider, RealtimeProvider, ...
│       │   └── types/                     re-exports desde packages/types
│       ├── public/
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   ├── types/                             OpenAPI → TS (auto-generado)
│   └── ui/                                componentes compartidos futuros (fase 2 mobile)
├── pnpm-workspace.yaml
├── turbo.json
└── package.json                           root
```

---

## 3. Estructura de una feature

Ejemplo `features/tasks/`:

```
features/tasks/
├── api/                                   wrappers tipados sobre apiClient
│   ├── list-tasks.ts
│   ├── get-task.ts
│   ├── create-task.ts
│   ├── update-task.ts
│   └── change-task-state.ts
├── hooks/                                 TanStack Query hooks
│   ├── use-tasks.ts
│   ├── use-task.ts
│   ├── use-create-task.ts
│   ├── use-update-task.ts
│   └── use-task-realtime.ts               suscripción Reverb + cache sync
├── components/
│   ├── task-card.tsx                      client component
│   ├── task-list.tsx                      client component
│   ├── task-detail-panel.tsx              client component (Sheet lateral)
│   ├── task-form.tsx
│   ├── kanban-board.tsx                   DnD con @dnd-kit
│   └── task-timer.tsx
├── lib/
│   ├── state-machine.ts                   constantes FSM compartidas
│   └── priority-helpers.ts
└── types.ts                               Task, TaskState, ... (re-export desde packages/types)
```

**Regla:** features no se importan entre sí. Si `tasks` necesita data de `people`, lo pide al API (un endpoint dedicado) o via una key compartida en `packages/types`.

---

## 4. App Router: estructura de rutas

```
src/app/
├── layout.tsx                             root layout + providers
├── globals.css                            tokens + tailwind
├── not-found.tsx
├── error.tsx
│
├── (auth)/                                group sin shell
│   ├── login/page.tsx
│   ├── registro/page.tsx                  registrar tenant
│   └── invitaciones/
│       └── aceptar/page.tsx
│
├── (app)/                                 group con AppShell
│   ├── layout.tsx                         Sidebar + Topbar
│   ├── page.tsx                           Mi día (redirect según rol)
│   ├── mi-dia/page.tsx                    dashboard practicante
│   ├── dashboard/page.tsx                 dashboard líder/RRHH
│   ├── tareas/
│   │   ├── page.tsx                       lista / kanban (según view)
│   │   ├── [id]/page.tsx                  detalle RSC
│   │   └── (crear)/nueva/page.tsx
│   ├── proyectos/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── practicantes/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx                  perfil con tabs
│   ├── reportes-diarios/
│   │   ├── page.tsx
│   │   └── hoy/page.tsx                   shortcut al de hoy
│   ├── evaluaciones/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── reportes/
│   │   ├── page.tsx
│   │   └── universidad/solicitar/page.tsx
│   ├── notificaciones/page.tsx
│   └── configuracion/
│       ├── perfil/page.tsx
│       ├── equipo/page.tsx                solo admin
│       ├── notificaciones/page.tsx        preferencias
│       ├── scorecards/page.tsx            solo HR/admin
│       └── templates-reportes/page.tsx
│
└── api/
    └── (nada: proxy nativo Next al backend via fetch directa)
```

**Regla App Router:** cada `page.tsx` es ≤50 líneas. Importa feature components y renderiza. Sin lógica.

---

## 5. Server Components vs Client Components

| Ejemplo | Tipo | Por qué |
|---|---|---|
| Landing `mi-dia/page.tsx` | **Server** | Listado inicial estático, TTFB bajo |
| `TaskDetailPanel` (con timer, form, live updates) | Client | Estado local + realtime |
| `KanbanBoard` (DnD) | Client | Drag & drop eventos |
| `CommandPalette` | Client | Portal, keybindings |
| Dashboard `dashboard/page.tsx` | **Server** + client widgets | KPIs primera carga server; widgets interactivos client |
| Formularios (login, task create, evaluation responses) | Client | Validación + estado |
| Paneles de detalle (read-only) | Server | Nothing interactive |

**Señal simple:** si tiene `useState`, `useEffect`, `onClick` → client. Si solo renderiza → server.

---

## 6. Data fetching

### 6.1 Server (RSC)

Directo con `fetch` en la page:

```tsx
// app/(app)/tareas/page.tsx
import { listTasks } from '@/features/tasks/api/list-tasks'
import { KanbanBoard } from '@/features/tasks/components/kanban-board'

export default async function TareasPage({ searchParams }: { searchParams: Promise<{ project_id?: string }> }) {
  const { project_id } = await searchParams
  const initialTasks = await listTasks({ project_id })  // ejecuta en el server, forward cookies

  return <KanbanBoard initialData={initialTasks} projectId={project_id} />
}
```

La función `listTasks` hace fetch al backend incluyendo cookies de sesión (forward de Next). El client component `KanbanBoard` recibe `initialData` y lo hidrata en TanStack Query vía `useQuery({ queryKey, queryFn, initialData })`.

### 6.2 Client (TanStack Query)

Todas las mutaciones y re-fetches viven en hooks:

```ts
// features/tasks/hooks/use-tasks.ts
export function useTasks(params: ListTasksParams) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => listTasks(params),
    staleTime: 10_000,
  })
}

// features/tasks/hooks/use-change-task-state.ts
export function useChangeTaskState() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: changeTaskState,
    onMutate: async ({ taskId, state }) => {
      // Optimistic
      await qc.cancelQueries({ queryKey: ['tasks'] })
      const prev = qc.getQueryData(['task', taskId])
      qc.setQueryData(['task', taskId], (old: any) => old && { ...old, state })
      return { prev }
    },
    onError: (_err, vars, ctx) => {
      qc.setQueryData(['task', vars.taskId], ctx?.prev)
      toast.error('No se pudo cambiar el estado')
    },
    onSettled: (_, __, vars) => {
      qc.invalidateQueries({ queryKey: ['task', vars.taskId] })
    },
  })
}
```

---

## 7. Error + loading UX

- **Loading:** skeleton loaders por componente. Nada de spinners centrales excepto auth.
- **Errors:** error boundary a nivel feature (`features/{x}/error-boundary.tsx`), fallback UX con botón "reintentar". Sentry captura.
- **Empty states:** siempre ilustración + mensaje + CTA. Nunca "No hay resultados." suelto.
- **Optimistic rollback:** toast de error con "Deshacer" cuando sea posible.

---

## 8. Acceso a API desde client

El `apiClient` (ver [02-state.md](02-state.md) sección 3) envuelve `fetch`:
- `credentials: 'include'` para cookies Sanctum cross-subdomain
- `X-XSRF-TOKEN` auto inyectado desde cookie
- Base URL desde `NEXT_PUBLIC_API_URL`
- Errores 401 disparan redirect a `/login`
- Errores 403/422/etc. se propagan como `ApiError` con payload

---

## 9. Internacionalización

MVP: **solo es-MX** (español México).

Estructura preparada para fase 2:
- Strings en `lib/i18n/es-MX.ts` (flat namespace, no JSON)
- Helper `t('tasks.create_button')` con fallback
- Fecha/hora con `date-fns` locale `es` + `Intl.DateTimeFormat`
- Sin `next-intl` u otra lib — es overhead innecesario para 1 idioma.

Fase 2 añade `en-US`, `pt-BR` con `next-intl` si hace falta.

---

## 10. Bundle + performance targets

| Métrica | Target |
|---|---|
| FCP (First Contentful Paint) | <1.8s en 4G |
| LCP | <2.5s |
| TTI | <3.5s |
| CLS | <0.1 |
| JS inicial en home (First Load JS) | <180 KB gzipped |

**Estrategias:**
- RSC agresivo (menos JS al cliente).
- Code splitting por ruta (default en App Router).
- `next/dynamic` para componentes pesados (KanbanBoard DnD, CommandPalette).
- Imágenes con `next/image` siempre.
- Prefetch de rutas en hover de links del sidebar.

---

## 11. Accesibilidad

- Contraste AA+ en texto normal, AAA en texto crítico (KPIs, CTAs).
- Nav completa por teclado (Tab visible, skip link).
- ARIA correctos: `aria-label` en icon buttons, `role="status"` en toasts, `aria-live` en contadores unread.
- `prefers-reduced-motion` respetado en animaciones.
- Modales con focus trap (Radix maneja).
- Tamaño táctil ≥44px en mobile.

---

## 12. Testing

MVP pragmático:
- **Unit (Vitest):** helpers, utilidades, lógica de formularios.
- **Component (Vitest + Testing Library):** componentes compartidos clave (TaskCard, CommandPalette, forms críticos).
- **E2E (Playwright):** 5-7 flujos happy path
  1. Registrar tenant + login
  2. Aceptar invitación
  3. Crear task y moverla por FSM
  4. Timer start/stop
  5. Enviar reporte diario
  6. Generar reporte universitario
  7. Marcar notificación como leída

No: test coverage del 100%. Sí: los flujos que si fallan nos cuestan un cliente.
