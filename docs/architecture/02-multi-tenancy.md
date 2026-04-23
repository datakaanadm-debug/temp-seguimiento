# 02 · Multi-tenancy

> **Regla de oro:** ninguna fila de ninguna tabla puede ser leída ni escrita sin un `tenant_id` resuelto y validado. Si esto se rompe, toda la app es inválida.

---

## 1. Modelo de aislamiento elegido

**Shared database, shared schema, con Row Level Security (RLS) de PostgreSQL y columna `tenant_id` en cada tabla de negocio.**

| Opción | Elegida | Por qué / por qué no |
|---|---|---|
| Database-per-tenant | ❌ | Migraciones N veces, backups N veces, inviable con 100+ tenants en Railway. |
| Schema-per-tenant | ❌ | Mejor aislamiento, peor performance con `SET search_path` en cada request y Eloquent no lo soporta idiomáticamente. Migrar aquí es una opción si un Enterprise lo exige. |
| **Shared schema + RLS** ✅ | ✅ | Escalable, económico. RLS pone la última barrera en el motor de DB: aunque el código app falle, Postgres bloquea la fuga. |

**Trade-off asumido:** un bug grave de app + RLS mal configurado podría exponer datos. Mitigación: tests automatizados de aislamiento + auditoría mensual de políticas.

---

## 2. Estructura de tabla estándar

Toda tabla de negocio (excepto `tenants`, `users` y tablas globales) lleva:

```sql
CREATE TABLE tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    -- ... campos del dominio ...
    created_by      UUID REFERENCES users(id),
    updated_by      UUID REFERENCES users(id),
    deleted_at      TIMESTAMPTZ NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice compuesto obligatorio: tenant_id SIEMPRE primero
CREATE INDEX idx_tasks_tenant ON tasks (tenant_id);
CREATE INDEX idx_tasks_tenant_project ON tasks (tenant_id, project_id) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;  -- aplica también a owner de la tabla

CREATE POLICY tenant_isolation ON tasks
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

Notas clave:
- `FORCE ROW LEVEL SECURITY`: sin esto, el usuario owner de la tabla (típicamente el usuario de app) podría saltarse la policy. Con `FORCE`, ni el owner puede.
- `current_setting('app.tenant_id', true)`: el segundo arg `true` hace que devuelva NULL si no está definido, en lugar de error. La policy entonces falla con 0 filas (seguro por defecto).
- Todos los índices **comienzan por `tenant_id`**. Sin esto, Postgres puede elegir planes ineficientes que igual filtran la tabla completa antes de aplicar RLS.

---

## 3. Tabla `tenants` y tablas globales

`tenants`, `plans`, `features`, `migrations`, `jobs`, `failed_jobs`, `telescope_*` (dev) son **globales** y **no llevan RLS**. Solo el backend accede; jamás se exponen vía API pública sin filtro explícito.

```sql
CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(50) UNIQUE NOT NULL,  -- subdominio: slug.interna.app
    name            VARCHAR(150) NOT NULL,
    plan            VARCHAR(30) NOT NULL DEFAULT 'starter',
    status          VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, suspended, churned
    settings        JSONB NOT NULL DEFAULT '{}',
    theme           JSONB NOT NULL DEFAULT '{}',  -- override de tokens
    data_residency  VARCHAR(10) NOT NULL DEFAULT 'latam',  -- latam, us, eu
    suspended_at    TIMESTAMPTZ NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tenants_slug ON tenants (slug);
CREATE INDEX idx_tenants_status ON tenants (status);
```

`users` es un caso especial: puede pertenecer a **uno o más tenants** a través de `memberships`, pero el record en `users` es global para permitir login pre-selección de tenant en futuro (fase 2). En MVP, 1 user = 1 tenant, pero el esquema ya lo soporta.

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           CITEXT UNIQUE NOT NULL,
    password_hash   VARCHAR(255),
    email_verified_at TIMESTAMPTZ,
    -- PII mínimo aquí; perfil extendido vive en profiles (con RLS)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    role            VARCHAR(30) NOT NULL,  -- tenant_admin, hr, team_lead, mentor, intern, viewer
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, user_id)
);
CREATE INDEX idx_memberships_tenant ON memberships (tenant_id);
CREATE INDEX idx_memberships_user ON memberships (user_id);

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON memberships
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

---

## 4. Resolución del tenant

El tenant se resuelve desde 2 fuentes, en este orden:

1. **Subdomain del `Host` header** (`acme.interna.app` → `slug = acme`). Caso normal.
2. **Claim `tid` del Sanctum token** — fallback y validación cruzada.

```php
// app/Http/Middleware/ResolveTenant.php
public function handle(Request $request, Closure $next)
{
    $host = $request->getHost();
    $slug = $this->extractSubdomain($host);  // 'acme' de 'acme.interna.app'

    if (!$slug || in_array($slug, ['www', 'api', 'app'])) {
        abort(400, 'Tenant subdomain required');
    }

    $tenant = Cache::remember(
        "tenant:slug:{$slug}",
        now()->addMinutes(5),
        fn () => Tenant::where('slug', $slug)->where('status', 'active')->first()
    );

    if (!$tenant) {
        abort(404, 'Tenant not found or suspended');
    }

    // Set session-local variable para RLS
    DB::statement("SELECT set_config('app.tenant_id', ?, false)", [$tenant->id]);

    // Bind al container para resolver en otros lados
    app()->instance(Tenant::class, $tenant);

    // OTel
    OpenTelemetry::current()->setAttribute('tenant.id', $tenant->id);
    OpenTelemetry::current()->setAttribute('tenant.slug', $tenant->slug);

    return $next($request);
}
```

**Punto crítico:** `set_config(..., false)` usa ámbito de sesión, no de transacción. Con Octane + workers persistentes, esto significa que la siguiente request en el mismo worker heredaría el tenant_id anterior si no se resetea. Por eso **el middleware corre en CADA request**, sobrescribiendo el valor.

Alternativa más segura: usar `set_config(..., true)` (scope de transacción) y envolver TODA la lógica en `DB::transaction(...)`. Se hace para mutaciones, pero para GETs es overhead innecesario. Mitigación actual: resetear explícitamente al inicio de cada request.

### 4.1 Subdominio reservado para API

- `acme.interna.app` → web del tenant (Next.js)
- `api.interna.app` → Laravel API único (el tenant llega en JWT/cookie)
- `api.acme.interna.app` — **opcional fase 2** para custom domains

Esto permite que el backend sea un único deployment. El frontend en `acme.interna.app` llama a `https://api.interna.app/api/v1/...` con `credentials: 'include'` + `withCredentials`. Sanctum cookie está scoped a `.interna.app` para cross-subdomain.

---

## 5. Eloquent: scope automático por tenant

**Principio:** el programador NO debe recordar filtrar por `tenant_id` en queries. La base debe forzarlo.

### 5.1 Trait `BelongsToTenant`

```php
namespace App\Shared\Concerns;

use App\Modules\Identity\Domain\Tenant;
use Illuminate\Database\Eloquent\Model;
use App\Shared\Scopes\TenantScope;

trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope());

        static::creating(function (Model $model) {
            if (!$model->tenant_id && app()->bound(Tenant::class)) {
                $model->tenant_id = app(Tenant::class)->id;
            }
            if (!$model->tenant_id) {
                throw new \RuntimeException(
                    'Cannot create ' . get_class($model) . ' without tenant context'
                );
            }
        });
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
```

### 5.2 Scope global

```php
namespace App\Shared\Scopes;

use App\Modules\Identity\Domain\Tenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if (app()->bound(Tenant::class)) {
            $builder->where(
                $model->qualifyColumn('tenant_id'),
                app(Tenant::class)->id
            );
        }
    }
}
```

**Por qué dos capas (app scope + RLS DB):**
1. App scope mantiene queries correctas incluso en caminos donde `set_config` pudiera fallar (jobs, consola).
2. RLS en DB es el cinturón de seguridad: si falla el app scope, la DB bloquea.

---

## 6. Jobs, comandos y contextos sin request HTTP

Los jobs async y comandos Artisan **no tienen Host header**. Hay que pasarles el tenant explícitamente.

```php
// Al dispatchar
NotifyAssignees::dispatch($task)->onConnection('tenant-' . $task->tenant_id);

// En el job
class NotifyAssignees implements ShouldQueue
{
    use Dispatchable, Queueable;

    public function __construct(public Task $task) {}

    public function handle(): void
    {
        TenantContext::run($this->task->tenant_id, function () {
            // Aquí dentro, app(Tenant::class) y RLS funcionan
            $assignees = $this->task->assignees()->get();
            // ...
        });
    }
}
```

`TenantContext::run` es un helper que:
1. Resuelve el tenant desde el id.
2. Hace `set_config('app.tenant_id', ...)` en la conexión actual.
3. Bindea `Tenant::class` en el container.
4. Ejecuta el callback.
5. Resetea al salir (clave para workers Horizon que sirven varios tenants).

---

## 7. Colas por tenant

En Redis, los jobs se enrutan con prefijo:

```
queue:default              → global (emails de sistema)
queue:tenant-<uuid>:default
queue:tenant-<uuid>:ai     → jobs IA (throttleados)
queue:tenant-<uuid>:reports → PDFs
```

Horizon supervisa todas. Rate limits por tenant:

```php
// config/horizon.php
'environments' => [
    'production' => [
        'default' => ['connection' => 'redis', 'queue' => ['default']],
        'tenant' => [
            'connection' => 'redis',
            'queue' => ['tenant-*:default', 'tenant-*:ai', 'tenant-*:reports'],
            'maxProcesses' => 10,
            'balance' => 'auto',
        ],
    ],
],
```

Esto evita que un tenant con 500 reportes PDF bloquee los jobs de todos los demás.

---

## 8. Cache por tenant

**Regla:** toda key en Redis lleva prefijo `t:{tenant_id}:` excepto keys globales explícitas (`tenant:slug:...`, `health`, etc.).

```php
// app/Shared/Cache/TenantCache.php
class TenantCache
{
    public static function remember(string $key, $ttl, Closure $callback)
    {
        $tenantKey = 't:' . app(Tenant::class)->id . ':' . $key;
        return Cache::remember($tenantKey, $ttl, $callback);
    }

    public static function forget(string $key): void
    {
        Cache::forget('t:' . app(Tenant::class)->id . ':' . $key);
    }
}
```

Cuando un tenant se suspende/elimina, `SCAN` + `DEL` por prefijo purga todo su cache.

---

## 9. Storage: path por tenant

En Cloudflare R2, bucket único `interna-prod` con estructura:

```
/tenants/{tenant_id}/
    attachments/{task_id}/{uuid}-{filename}
    avatars/{user_id}/{timestamp}.jpg
    reports/{report_id}.pdf
    theme/logo.png
/system/
    email-templates/
```

Acceso siempre vía **pre-signed URLs** (15 min TTL), generadas por el backend que valida que el tenant actual puede leer la ruta. **Nunca URLs públicas directas.**

---

## 10. Observabilidad por tenant

- **Logs:** estructurados JSON con `tenant_id` como top-level field. Filtros en Grafana Loki por `{tenant_id="..."}`.
- **Métricas:** Prometheus labels incluyen `tenant_id` pero **cardinalidad controlada** — solo métricas agregadas (request_count, error_rate), no métricas por request. Histogramas por tenant solo para los top-10 tenants.
- **Traces:** cada span lleva `tenant.id` atributo. Samplear al 10% en free tier, 100% para errores y tenants enterprise.

---

## 11. Tests de aislamiento (mandatorios)

Estos tests son **parte del CI bloqueante**. Si uno falla, no se mergea.

```php
// tests/Feature/TenantIsolationTest.php

it('no permite leer tasks de otro tenant via API', function () {
    [$tenantA, $tenantB] = Tenant::factory()->count(2)->create();
    $userA = User::factory()->forTenant($tenantA)->create();
    $taskB = Task::factory()->forTenant($tenantB)->create();

    $this->actingAs($userA)
        ->get("/api/v1/tasks/{$taskB->id}")
        ->assertStatus(404);  // no 403 — no debemos revelar existencia
});

it('no permite crear registros con tenant_id de otro tenant', function () {
    [$tenantA, $tenantB] = Tenant::factory()->count(2)->create();
    $userA = User::factory()->forTenant($tenantA)->create();

    $this->actingAs($userA)
        ->post('/api/v1/tasks', [
            'title' => 'Hack',
            'tenant_id' => $tenantB->id,  // intento de forzar
            'project_id' => Project::factory()->forTenant($tenantA)->create()->id,
        ])
        ->assertStatus(201);

    // El tenant_id del request se IGNORA, se usa el del contexto
    expect(Task::withoutGlobalScopes()->latest()->first()->tenant_id)
        ->toBe($tenantA->id);
});

it('RLS bloquea queries directas sin tenant context', function () {
    [$tenantA, $tenantB] = Tenant::factory()->count(2)->create();
    Task::factory()->forTenant($tenantA)->count(3)->create();
    Task::factory()->forTenant($tenantB)->count(5)->create();

    DB::statement("SELECT set_config('app.tenant_id', ?, false)", [$tenantA->id]);
    expect(DB::table('tasks')->count())->toBe(3);

    DB::statement("SELECT set_config('app.tenant_id', ?, false)", [$tenantB->id]);
    expect(DB::table('tasks')->count())->toBe(5);

    DB::statement("SELECT set_config('app.tenant_id', '', false)");
    expect(DB::table('tasks')->count())->toBe(0);  // RLS bloquea todo
});

it('scope Eloquent filtra correctamente por tenant', function () {
    // ... test similar al anterior pero vía Eloquent
});

it('jobs que no resuelven tenant context fallan explícitamente', function () {
    $task = Task::factory()->create();
    app()->forgetInstance(Tenant::class);

    expect(fn () => NotifyAssignees::dispatchSync($task))
        ->toThrow(TenantContextMissing::class);
});
```

Cobertura mínima MVP: **≥95% en el módulo Identity y tests de aislamiento en cada dominio nuevo**.

---

## 12. Migración a schema-per-tenant (futuro, fase 2 enterprise)

Si un cliente Enterprise exige aislamiento físico, la ruta es:

1. Nuevo bucket R2 dedicado.
2. Nueva database Postgres (schema `tenant_acme` o DB separada en otro región).
3. Laravel tenancy (Spatie o Stancl/Tenancy) con middleware que cambia `search_path` o conexión por tenant.
4. Los dominios siguen siendo idénticos — solo cambia la resolución de conexión.

El diseño actual está preparado para esto: todo pasa por `TenantScope` y `TenantContext::run`. La diferencia en fase 2 será dónde viven los datos, no cómo se accede a ellos en código.

---

## 13. Checklist de revisión para cada PR

Al añadir tabla/módulo nuevo, el PR **debe tener**:

- [ ] Columna `tenant_id UUID NOT NULL` en la migración.
- [ ] FK a `tenants(id) ON DELETE RESTRICT`.
- [ ] Índice compuesto con `tenant_id` primero.
- [ ] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` y `FORCE`.
- [ ] `CREATE POLICY tenant_isolation USING (tenant_id = current_setting('app.tenant_id', true)::uuid)`.
- [ ] Modelo Eloquent usa `trait BelongsToTenant`.
- [ ] Test de aislamiento entre 2 tenants (lectura + creación).
- [ ] Keys de Redis cacheadas con `TenantCache`.
- [ ] Paths en R2 bajo `tenants/{tenant_id}/`.
- [ ] Jobs que consumen la tabla usan `TenantContext::run`.
