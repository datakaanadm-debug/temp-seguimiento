# 04 · Offline / PWA

> MVP offline-light: el app funciona degradadamente sin red, pero NO sincroniza escrituras offline. Fase 2 añade cola de mutaciones y conflict resolution.

---

## 1. Alcance MVP

**Qué se soporta sin red:**
- Última vista renderizada persiste (service worker cache de assets + HTML shell).
- Datos ya cargados en TanStack Query cache siguen visibles.
- UI muestra banner "Sin conexión" con dot rojo.
- Formularios críticos (reporte diario) guardan draft en `localStorage` hasta que vuelva la red.

**Qué NO se soporta:**
- Enviar mutations con red abajo (se muestran como "pendiente" hasta que vuelva).
- Conflict resolution (si alguien más editó mientras estabas offline).
- Push notifications offline.

Esto es una concesión consciente: el flujo principal (reporte diario, timer, ver tablero) funciona en red volátil. Sync genuino offline es trabajo de fase 2.

---

## 2. Service Worker

Generado por `next-pwa` (fase 2) o manualmente. Para MVP:

- Precache del shell (HTML + JS crítico + CSS).
- Runtime cache de `/api/v1/*` con estrategia `network-first, cache-fallback, 5s timeout`.
- R2 assets (avatars, attachments) con `cache-first, 7d TTL`.

```js
// public/sw.js (MVP manual)
const SHELL_CACHE = 'interna-shell-v1'
const API_CACHE = 'interna-api-v1'
const SHELL = ['/', '/mi-dia', '/tareas', '/manifest.webmanifest']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)))
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)

  // Solo GET /api/v1: network first with cache fallback
  if (req.method === 'GET' && url.pathname.startsWith('/api/v1')) {
    e.respondWith(networkFirst(req))
    return
  }
})

async function networkFirst(req) {
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 5000)),
    ])
    const cache = await caches.open(API_CACHE)
    cache.put(req, res.clone())
    return res
  } catch {
    const cached = await caches.match(req)
    if (cached) return cached
    throw new Error('offline')
  }
}
```

Registro en `app/layout.tsx` (fase 2 cuando estabilicemos el shell).

---

## 3. Manifest PWA

```json
// public/manifest.webmanifest
{
  "name": "Senda",
  "short_name": "Senda",
  "description": "Gestión de practicantes",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0F172A",
  "theme_color": "#0891B2",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Link en `app/layout.tsx`:
```tsx
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#0891B2" />
```

---

## 4. Banner "Sin conexión"

```tsx
// components/shared/offline-banner.tsx
'use client'
export function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  if (online) return null
  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-white text-sm py-1.5 px-4 text-center">
      Sin conexión · Estás viendo datos en caché. Los cambios no se guardarán hasta que vuelva la red.
    </div>
  )
}
```

Se monta en `app/(app)/layout.tsx` debajo del topbar.

---

## 5. Drafts de formularios críticos

El reporte diario es el caso más importante (el practicante puede estar en una cafetería con WiFi inestable):

```ts
// hooks/use-form-draft.ts
export function useFormDraft<T>(key: string, form: UseFormReturn<T>, ttlDays = 7) {
  useEffect(() => {
    const draftKey = `draft:${key}`
    const raw = localStorage.getItem(draftKey)
    if (raw) {
      try {
        const { data, timestamp } = JSON.parse(raw)
        if (Date.now() - timestamp < ttlDays * 86_400_000) {
          form.reset(data)
        }
      } catch {}
    }

    const sub = form.watch((value) => {
      localStorage.setItem(draftKey, JSON.stringify({ data: value, timestamp: Date.now() }))
    })
    return () => sub.unsubscribe()
  }, [key, form, ttlDays])
}

// cuando se submit exitoso:
localStorage.removeItem(`draft:${key}`)
```

Clave: `draft:daily-report:{user_id}:{date}`. Lo consume `features/tracking/components/daily-report-form.tsx`.

---

## 6. Deferred: queue offline (fase 2)

Para fase 2, implementar `OfflineMutationQueue`:

1. Interceptar mutations en TanStack Query.
2. Si `navigator.onLine === false`, encolar en IndexedDB con timestamp.
3. Al reconectar, drenar la cola en orden FIFO con conflict detection (si el servidor devuelve 409/422, mostrar resolución manual).
4. UI muestra badge con contador de mutations pendientes.

Esto es trabajo serio de 2-3 semanas. Aplazado a fase 2.

---

## 7. Testing offline

- Chrome DevTools → Network → Offline.
- Verificar: app no crashea, banner aparece, último estado visible, no intenta fetches bloqueantes.
- Playwright E2E con `page.context().setOffline(true)` para un flujo crítico.

---

## 8. Alternativas evaluadas

| Opción | Por qué no MVP |
|---|---|
| `next-pwa` | Overhead config para un MVP; reservamos para fase 2. |
| Workbox manual completo | Mucho código, poco ROI. |
| Sync APIs (Background Sync API) | Experimental en Chrome, no en Safari. |
| Apollo/Urql offline first | Cambiar cliente HTTP completo por esto — fuera de scope. |

El MVP offline-light cubre 80% del dolor (ver datos ya cargados + drafts) con 20% del esfuerzo.
