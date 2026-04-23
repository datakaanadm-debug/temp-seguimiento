# 06 · Caching

> **Regla 1:** cachear lo caro, lo frecuente, lo estable.
> **Regla 2:** la invalidación es más difícil que el caching. Diseñarla primero.
> **Regla 3:** todo key lleva prefijo `t:{tenant_id}:` salvo keys globales explícitas.

---

## 1. Capas de cache

| Capa | Tecnología | TTL típico | Uso |
|---|---|---|---|
| Navegador | HTTP headers (Cache-Control, ETag) | 0-60min | Assets estáticos, favicon, theme.css |
| CDN (Cloudflare) | Edge cache | 1h-1d | Assets de Next.js, imágenes R2 públicas |
| App (Next.js) | RSC + `revalidate` | según ruta | Páginas que no cambian por usuario |
| Server app (Laravel) | Redis | segundos-horas | Queries caras, data estable |
| Request scope | Container singleton | request | Tenant, user, computed permissions |

---

## 2. Redis: estructura de keys

Convención: `{scope}:{tenant_id}:{domain}:{specifier}:v{version}`

| Key | TTL | Contenido |
|---|---|---|
| `t:{tid}:perm:{user_id}:v1` | 5 min | Permisos calculados de un usuario (rol + scopes) |
| `t:{tid}:dashboard:lead:{user_id}:v1` | 2 min | Payload del dashboard de líder (agregado) |
| `t:{tid}:dashboard:hr:v1` | 5 min | Dashboard RRHH (más estable) |
| `t:{tid}:tasks:project:{pid}:page:{n}:v2` | 30 s | Lista paginada de tareas |
| `t:{tid}:stats:team:{tid_team}:v1` | 10 min | KPIs agregados del equipo |
| `t:{tid}:theme:v{theme_version}` | 1 h | CSS generado con tokens del tenant |
| `t:{tid}:search:tasks:q:{hash}` | 1 min | Resultados de búsqueda |
| `t:{tid}:ai:summary:daily:{user_id}:{date}` | 24 h | Resumen IA del día (inmutable tras generarse) |
| `tenant:slug:{slug}` | 5 min | Tenant resuelto por slug |
| `health` | n/a | Estado del sistema |

**Sufijo `:vN`:** si cambia el shape del payload, se incrementa N y las keys viejas se expiran naturalmente por TTL. Evita pushes donde hay que purgar cache manualmente.

---

## 3. Patrón general: cache-aside con lock

Usar `Cache::remember` directamente tiene riesgo de **cache stampede**: 100 requests expiran el mismo key y los 100 recalculan en paralelo. Solución: `Cache::lock` + `remember`.

```php
// app/Shared/Cache/TenantCache.php
class TenantCache
{
    public static function remember(string $key, int $ttlSeconds, Closure $callback)
    {
        $fullKey = self::prefix($key);
        $lockKey = "lock:{$fullKey}";

        $cached = Cache::get($fullKey);
        if ($cached !== null) {
            return $cached;
        }

        // Lock para evitar stampede
        return Cache::lock($lockKey, 10)->block(5, function () use ($fullKey, $ttlSeconds, $callback) {
            // Doble check dentro del lock
            $cached = Cache::get($fullKey);
            if ($cached !== null) {
                return $cached;
            }
            $value = $callback();
            Cache::put($fullKey, $value, $ttlSeconds);
            return $value;
        });
    }

    public static function forget(string $key): void
    {
        Cache::forget(self::prefix($key));
    }

    public static function forgetByPrefix(string $prefixFragment): void
    {
        $scanPrefix = self::prefix($prefixFragment);
        $conn = Redis::connection('cache');
        $cursor = 0;
        do {
            [$cursor, $keys] = $conn->scan($cursor, ['MATCH' => "{$scanPrefix}*", 'COUNT' => 100]);
            if ($keys) {
                $conn->del($keys);
            }
        } while ($cursor !== 0 && $cursor !== '0');
    }

    private static function prefix(string $key): string
    {
        $tenantId = app()->bound(Tenant::class) ? app(Tenant::class)->id : 'global';
        return "t:{$tenantId}:{$key}";
    }
}
```

Uso:

```php
$dashboard = TenantCache::remember(
    "dashboard:lead:{$user->id}:v1",
    ttlSeconds: 120,
    callback: fn () => $this->buildLeaderDashboard($user)
);
```

---

## 4. Qué se cachea (MVP)

### 4.1 Permisos calculados

**Por qué:** cada request evalúa policies 10+ veces. Calcular el set de permisos + scopes del user cuesta 3-5 queries.

```php
// app/Modules/Identity/Infrastructure/Cache/CachedUserPermissions.php
class CachedUserPermissions
{
    public static function for(User $user): array
    {
        return TenantCache::remember(
            "perm:{$user->id}:v1",
            ttlSeconds: 300,
            callback: fn () => [
                'role' => $user->primaryRole(),
                'permissions' => $user->getAllPermissions()->pluck('name')->all(),
                'scope' => [
                    'team_id' => $user->leadTeamId(),
                    'mentee_ids' => $user->menteeIds(),
                ],
            ]
        );
    }
}
```

Invalidación: cuando se cambia rol/permiso/asignación del user → `TenantCache::forget("perm:{$user->id}:v1")`. Hook en listener `MembershipChanged`.

### 4.2 Dashboards

**Por qué:** agregaciones con JOINs pesados, reexecutadas cada vez que el líder mira su panel.

TTL: 2 min para dashboard líder (activo), 5 min para RRHH (más estable), 10 min para supervisor/admin.

Invalidación proactiva **no** se hace (cara); se confía en el TTL corto. Excepción: cuando una métrica crítica cambia (ej. `BlockerRaised`), se dispara un listener que borra el key correspondiente para que el próximo load vea el cambio.

### 4.3 Listas de tareas paginadas

**Por qué:** página 1 del Kanban de un proyecto es pedida por todos los miembros del equipo repetidamente.

TTL: 30s.

Invalidación: cualquier `TaskCreated/Updated/StateChanged/Deleted` en el project → `TenantCache::forgetByPrefix("tasks:project:{$pid}")`. Los ~5-20 keys de páginas se borran en 1-2 ms.

### 4.4 Theme CSS del tenant

**Por qué:** `/api/v1/tenant/theme.css` se pide en cada primera visita. El CSS se genera a partir de `tenants.theme` JSONB con un templating simple.

TTL: 1h.

Invalidación: cuando admin guarda theme → `forget` + invalidar cache CDN (purga por URL con Cloudflare API).

### 4.5 Búsqueda full-text

**Por qué:** `GIN` en Postgres es rápido, pero repetir "encontrar todas las tareas con 'hero design'" miles de veces es desperdicio.

TTL: 1 min (balance entre frescura y ahorro).

Key: `t:{tid}:search:tasks:q:{md5(query+filters)}`.

Invalidación: no proactiva. Confiamos en TTL corto.

### 4.6 Resúmenes IA

**Por qué:** generar un resumen con Claude cuesta $0.003-$0.01 y tarda ~2s. Una vez generado el resumen del día de ayer, no cambia.

TTL: **sin expiración** (o 30 días). Los resúmenes son efectivamente inmutables una vez aprobados.

Key: `t:{tid}:ai:summary:daily:{user_id}:{yyyy-mm-dd}`.

Nota: estos se persisten **también en DB** (tabla `ai_summaries`). Redis es cache rápido; Postgres es fuente de verdad.

---

## 5. Qué NO se cachea (por diseño)

| Ítem | Por qué no |
|---|---|
| Detalle individual de Task / User | Cambio frecuente; cache corto no ayuda |
| Listados pequeños (<20 items) por user | Queries rápidas; cache es overhead |
| Counters/stats en tiempo real (p.ej. tareas activas hoy) | Datos volátiles; cache desactualiza UX |
| Sesiones | Manejadas por Sanctum/Redis directamente, no vía `Cache::` |
| Notificaciones individuales | Stream, no key-value |

---

## 6. Estrategias de invalidación

### 6.1 TTL corto + regeneración pasiva

Default para la mayoría. 30s-5min. Aceptamos ventana de inconsistencia a cambio de simplicidad.

### 6.2 Invalidación proactiva via listener

Cuando hay un evento de dominio que invalida un cache conocido.

```php
// app/Modules/Tasks/Infrastructure/Listeners/InvalidateTaskCache.php
class InvalidateTaskCache
{
    public function handle(TaskCreated|TaskUpdated|TaskStateChanged|TaskDeleted $event): void
    {
        $task = $event->task;
        TenantCache::forgetByPrefix("tasks:project:{$task->project_id}");
        TenantCache::forgetByPrefix("stats:team:{$task->team_id}");
        // Dashboard del asignado si existía
        if ($task->assignee_id) {
            TenantCache::forget("dashboard:intern:{$task->assignee_id}:v1");
        }
    }
}
```

### 6.3 Versionado (sufijo `:vN`)

Cuando cambia el shape del payload cacheado (ej. añadimos un campo en dashboard):
1. Incrementar versión en el código (`:v1` → `:v2`).
2. Deploy.
3. Keys viejas (`:v1`) expiran por TTL sin riesgo de leer cache stale con shape viejo.

Evita tener que escribir scripts de purge.

### 6.4 Purge por tenant (admin ops)

Cuando se detecta inconsistencia en un tenant:
```bash
php artisan cache:tenant:purge {tenant-id}
```
Hace `SCAN` + `DEL` de `t:{tid}:*`. Usar con cuidado (cold start temporal).

---

## 7. Contexto de Next.js (cliente)

### 7.1 TanStack Query

Queries configuradas por categoría:

```ts
// apps/web/lib/query-client.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,            // 30s default
      gcTime: 5 * 60 * 1000,           // 5 min en memoria antes de GC
      refetchOnWindowFocus: true,
      refetchOnMount: false,           // no refetch si stale fresh
      retry: (failureCount, error) => {
        const status = (error as any)?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
    },
  },
});
```

Overrides por tipo de data:

- **Dashboards:** `staleTime: 60s, refetchInterval: 60s` (polling suave).
- **Lista de tareas:** `staleTime: 10s`, invalidado por Reverb.
- **Perfil de usuario:** `staleTime: 5min`.
- **Métricas de evaluación:** `staleTime: 10min`.

### 7.2 Server Components

Rutas RSC que no son usuario-específicas usan `revalidate`:

```tsx
// apps/web/app/(dashboard)/settings/billing/page.tsx
export const revalidate = 300; // 5 min

export default async function BillingPage() {
  const plan = await fetchCurrentPlan();
  // ...
}
```

Rutas usuario-específicas: `revalidate: 0` (siempre dinámicas).

### 7.3 HTTP cache headers

- Assets Next.js (`/_next/static/*`): `Cache-Control: public, max-age=31536000, immutable` (hashing en nombre).
- Páginas SSR: `Cache-Control: private, no-cache, no-store, must-revalidate`.
- API responses: nunca cacheadas por browser/CDN (`Cache-Control: no-store`).
- `/api/v1/tenant/theme.css`: `Cache-Control: public, max-age=3600` con ETag basada en `theme_version`.

---

## 8. CDN (Cloudflare)

En fase MVP solo se usa para:
- Assets de Next.js (servidos desde Railway pero cacheados en edge).
- Imágenes públicas en R2 (avatars con pre-signed URL corta, no cacheables; logos de tenant sí).

Cuando escalemos a GCP (ver doc 07), CDN se vuelve central.

---

## 9. Configuración Redis

```env
REDIS_CLIENT=phpredis
REDIS_HOST=<railway-redis>
REDIS_PORT=6379
REDIS_PASSWORD=<doppler>
REDIS_DB=0          # cache
REDIS_CACHE_DB=1    # keys de aplicación
REDIS_QUEUE_DB=2    # Horizon queues
REDIS_SESSION_DB=3  # Sanctum sessions
```

Separar DBs por función permite métricas limpias (`INFO` por DB) y purge selectivo (ej. `FLUSHDB 1` borra cache sin tocar queues).

**Política de expiración:** `maxmemory-policy allkeys-lru` en cache DB (descarta las LRU cuando llega al límite). En queue DB: `noeviction` (fallar antes que perder jobs).

Memoria inicial Railway Redis: 256MB. Alertar si uso >80%.

---

## 10. Métricas y observabilidad del cache

| Métrica | Target | Alarma |
|---|---|---|
| Hit rate global | >80% | <60% → revisar TTLs |
| Hit rate dashboards | >90% | <70% → bug de invalidación |
| Memory usage Redis cache | <200MB | >230MB → aumentar o purgar |
| Eviction rate | <10/min | >100/min → aumentar memoria |
| `Cache::lock` contention | <50ms p95 wait | >500ms → revisar query subyacente |
| Error rate `forget`/`remember` | <0.1% | >1% → investigar Redis |

Comandos Redis útiles en ops:
```bash
redis-cli -h <host> INFO keyspace
redis-cli -h <host> --scan --pattern 't:abc123:*' | head
redis-cli -h <host> DBSIZE
```

---

## 11. Anti-patrones

1. ❌ **Cachear sin tenant prefix.** Leak cross-tenant garantizado.
2. ❌ **TTL >1h sin plan de invalidación.** Datos stale molestan a usuarios.
3. ❌ **Cache de escrituras.** El cache es para lecturas. Las mutaciones van directo a DB.
4. ❌ **`Cache::rememberForever`.** Siempre poner TTL. "Forever" es una mentira; Redis evicta bajo presión.
5. ❌ **Cachear modelos Eloquent completos.** Serializan muchísimo. Cachear arrays/DTOs.
6. ❌ **Invalidar por patrón en el hot path.** `SCAN` + `DEL` en un request sincrónico puede latir 100s de ms. Hacerlo en listener async.

---

## 12. Checklist antes de cachear algo nuevo

- [ ] Query actual es >50ms sostenido (medido, no supuesto).
- [ ] Tiene patrón de re-ejecución (>5/min/tenant).
- [ ] Dato es idempotente por `tenant_id` + key segmentador.
- [ ] TTL justificado (1s? 1h? con razón).
- [ ] Plan de invalidación: TTL puro / listener / versión / purge manual.
- [ ] Prefijo tenant incluido via `TenantCache::`.
- [ ] Lock considerado si payload es caro de generar (>100ms).
- [ ] Métricas: agregar al dashboard Grafana.
- [ ] Test que verifica invalidación ocurre en el evento esperado.
