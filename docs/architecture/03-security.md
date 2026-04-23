# 03 · Seguridad

> Enfoque: defense in depth. Capas independientes (edge, app, DB, storage). Una sola capa no es suficiente. Ninguna depende de que las otras no fallen.

---

## 1. Modelo de amenazas (resumen)

Principales actores y riesgos considerados:

| Actor | Vector | Impacto | Mitigación |
|---|---|---|---|
| Atacante externo sin cuenta | SQLi, XSS, CSRF, brute force login | Alto | WAF, CSP, CSRF tokens, rate limiting, password hashing |
| Usuario malicioso de tenant A | Intenta leer/modificar tenant B | **Crítico** | Multi-tenancy RLS + app scope (doc 02), tests automatizados |
| Usuario con rol limitado | Escalada de privilegios (IDOR, mass assignment) | Alto | RBAC + ABAC + FormRequest con allowlist |
| Atacante con token robado | Suplantación de usuario | Alto | Cookies httpOnly + SameSite, refresh rotation, detección de anomalía |
| Insider (dev con acceso prod) | Exfiltración, backdoor | Alto | Secrets en Doppler + audit log + least-privilege IAM |
| IA hallucination / prompt injection | Filtrar datos o tomar decisiones incorrectas | Medio | IA solo sugiere, nunca decide (ver doc producto). Sandbox de prompts. |
| DoS / abuso de recursos | Consumo de IA, storage, DB | Medio | Rate limits por tenant, quotas por plan, circuit breakers |

---

## 2. Autenticación

### 2.1 Mecanismos soportados (MVP)

| Mecanismo | Uso | Notas |
|---|---|---|
| **Email + password** | Default | Argon2id (PHC format), verify cada login |
| **Google OAuth** | Social | `league/oauth2-google` via Laravel Socialite |
| **Magic link** (email) | Recuperación + invitación | Token 1-uso TTL 1h |
| **Invitation link** | Onboarding de practicante | Token firmado + TTL 72h + 1 uso |

Fase 2: SAML 2.0, OIDC (Microsoft, Okta), WebAuthn/Passkeys.

### 2.2 Sessions y tokens

**Canal web (Next.js SSR + browser):** Sanctum stateful con cookie httpOnly.

```
Cookie name:  interna_session
HttpOnly:     true
Secure:       true (TLS only)
SameSite:     Lax  (permite navegación top-level post-OAuth)
Domain:       .interna.app  (cross-subdomain web↔api)
Max-Age:      2h con rolling refresh
Path:         /
```

**Canal API pública / integraciones:** Sanctum Personal Access Token, prefijo `int_live_`, scope limitado, rotable.

**Mobile (fase 2):** JWT access (15min) + refresh (30d con rotation on-use), revocación via Redis denylist.

### 2.3 Password policy

- Mínimo 12 caracteres (no 8; cumple NIST 2024).
- Check contra haveibeenpwned k-anonymity API (opt-in por tenant).
- Sin forzar mayúsculas/símbolos/números — NIST explícitamente desaconseja reglas de complejidad.
- Argon2id con m=64MB, t=3, p=1 (valores por defecto de PHP 8.3+).
- Rehash transparente si los parámetros cambian.

### 2.4 MFA (opcional, recomendado por rol)

- **Admin tenant:** obligatorio.
- **RRHH, líder, mentor:** opcional pero destacado.
- **Practicante:** opcional.

Implementación: TOTP via `pragmarx/google2fa` + recovery codes (10 × one-time).

### 2.5 Login brute force

- 5 intentos fallidos/email en 15 min → bloqueo de 30 min.
- 10 intentos fallidos/IP en 15 min → bloqueo de 1h.
- Implementado con `Illuminate\Cache\RateLimiter` + eventos a Sentry.
- **Mensaje de error genérico:** "Credenciales inválidas" — nunca distinguir email no existe de password incorrecto.

### 2.6 Refresh token rotation (cuando aplique, mobile fase 2)

1. Cliente envía refresh → server responde nuevo access + nuevo refresh, invalida el anterior.
2. Si un refresh ya usado vuelve a llegar → **sospecha de robo**, revocar toda la familia de tokens del usuario, forzar relogin, notificar al usuario por email.

---

## 3. Autorización: RBAC + ABAC

### 3.1 Roles del sistema

Definidos en migración `seed_system_roles.php`:

| Slug | Scope | Descripción |
|---|---|---|
| `system_admin` | global | Soporte Datakaan (fuera de tenants) |
| `tenant_admin` | tenant | Admin de la empresa, configura todo |
| `hr` | tenant | RRHH del programa |
| `team_lead` | team | Líder de equipo |
| `mentor` | personal | Mentor de N practicantes asignados |
| `intern` | personal | Practicante |
| `viewer` | team | Solo lectura (ej. supervisor de área) |

Roles **custom** por tenant: `tenant_admin` puede crear ("Coordinador académico", "Auditor externo") componiendo permisos atómicos. Persistidos en `roles` (con `tenant_id` nullable — `NULL` = rol del sistema).

### 3.2 Permisos atómicos

Convención: `{resource}.{action}` con action en `{view, create, update, delete, assign, export}`.

Ejemplos:
- `task.view`, `task.create`, `task.update`, `task.delete`, `task.assign`
- `evaluation.view`, `evaluation.create`, `evaluation.sign`
- `intern.view`, `intern.invite`, `intern.change_status`
- `report.view`, `report.export`
- `tenant.manage_billing`, `tenant.manage_integrations`

Gestionados con `spatie/laravel-permission` (teams mode = tenant_id).

### 3.3 ABAC: Policies con scope

Los roles dan permiso "en principio"; las policies validan el caso concreto.

```php
// app/Modules/Tasks/Http/Policies/TaskPolicy.php
class TaskPolicy
{
    public function view(User $user, Task $task): bool
    {
        // 1. Tenancy (redundante con RLS pero explícito)
        if ($task->tenant_id !== $user->currentTenant()->id) {
            return false;
        }

        // 2. Permiso atómico
        if (!$user->can('task.view')) {
            return false;
        }

        // 3. Scope según rol
        return match ($user->primaryRole()) {
            'tenant_admin', 'hr'  => true,
            'team_lead'           => $task->team_id === $user->leadTeamId(),
            'mentor'              => $task->assignee_id && in_array(
                                         $task->assignee_id,
                                         $user->menteeIds()
                                     ),
            'intern'              => $task->assignee_id === $user->id
                                     || $task->created_by === $user->id,
            default               => false,
        };
    }

    public function changeState(User $user, Task $task, string $from, string $to): bool
    {
        // FSM de tareas — ver doc producto sección 10.1
        $allowed = match ($to) {
            'IN_PROGRESS' => $task->assignee_id === $user->id,
            'IN_REVIEW'   => $task->assignee_id === $user->id,
            'DONE'        => in_array($user->primaryRole(), ['team_lead', 'mentor'])
                             && $task->assignee_id !== $user->id,  // no aprobar la propia
            'CANCELLED'   => in_array($user->primaryRole(), ['tenant_admin', 'team_lead']),
            'BLOCKED'     => true,  // cualquiera puede bloquear (con razón)
            default       => false,
        };

        return $allowed && $this->canTransition($from, $to);
    }
}
```

### 3.4 Mass assignment guard

Todos los modelos usan `$fillable` explícito **nunca** `$guarded = []`. Los FormRequests filtran por allowlist adicional.

```php
class UpdateTaskRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string|max:10000',
            'priority' => 'sometimes|in:urgent,high,normal,low',
            'due_at' => 'sometimes|nullable|date|after:now',
            // tenant_id, created_by, id — NO listados, no se aceptan
        ];
    }

    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('task'));
    }
}
```

### 3.5 IDOR prevention

Principio: **nunca** usar IDs secuenciales en URLs públicas. Todos los IDs son UUID v7 (ordenables temporalmente, no adivinables).

Además, cada endpoint valida explícitamente la pertenencia. `/tasks/{task}` carga `$task` con route model binding + global scope de tenant → si tenant no coincide, 404 automático.

---

## 4. Rate limiting

### 4.1 Capas

| Capa | Límite | Propósito |
|---|---|---|
| Edge (Cloudflare) | 1000 req/min/IP global | Frenar scrapers |
| App global | 100 req/min/IP por user | Abuso por cuenta |
| Por endpoint | ver tabla | Proteger endpoints caros |
| Por tenant | según plan | Fair-use entre tenants |

### 4.2 Endpoints críticos

| Endpoint | Límite | Justificación |
|---|---|---|
| `POST /auth/login` | 5/min/email, 20/min/IP | Anti brute force |
| `POST /auth/register` | 3/min/IP | Anti spam |
| `POST /password/reset` | 3/hora/email | Anti email bombing |
| `POST /tasks` | 60/min/user | Normal workflow |
| `POST /ai/summarize` | 10/min/user, 100/día/tenant (plan Starter) | Costo IA |
| `POST /reports/generate` | 10/hora/tenant | Carga de CPU + Puppeteer |

Implementación con `RateLimiter::for(...)` y middleware `throttle:<name>`.

### 4.3 Respuesta cuando se excede

HTTP 429 + header `Retry-After`. El frontend muestra un toast "Estás yendo muy rápido, intenta en 30s". Nunca cuenta regresiva visible que facilite scripting.

---

## 5. Validación y sanitización

### 5.1 Input

- **FormRequest en todos los endpoints.** No hay controlador que acepte `$request->all()` crudo.
- **Validación estricta de tipos.** `date`, `uuid`, `email`, `url`, `in:...`.
- **HTML en campos de texto largo** (descripciones, comentarios): sanitizado con `HTMLPurifier` en una lista blanca mínima (`<p>`, `<strong>`, `<em>`, `<a>`, `<code>`, `<ul>`, `<li>`). Cualquier otra etiqueta se escapa.
- **Markdown en descripciones:** parsed con `commonmark/league`, output pasado por HTMLPurifier también.

### 5.2 Output

- Escape automático de Blade (`{{ }}`).
- JSON responses: serialización segura por defecto en Resources. Nunca `return $model->toArray()` sin resource.
- CSRF tokens en formularios web (Sanctum lo maneja).

### 5.3 Archivos subidos

- **Tipos permitidos** en allowlist: `image/png`, `image/jpeg`, `image/webp`, `application/pdf`, `text/csv`, office docs.
- **Tamaño máximo** por tipo: 5MB imágenes, 20MB PDFs, 50MB total por tarea.
- **Magic number check** (no confiar en `Content-Type` del cliente).
- **Re-encode imágenes** con `intervention/image` para eliminar metadata EXIF y posible payload oculto.
- **Antivirus scan** (ClamAV en fase 2, o API externa como VirusTotal a demanda).
- Nombre de archivo: `{uuid}-{slugified_original}` — nunca nombre original puro.
- Storage: R2 con pre-signed URLs TTL 15 min.

---

## 6. Protecciones contra OWASP Top 10 (2021)

| # | Riesgo | Mitigación |
|---|---|---|
| A01 Broken Access Control | RBAC+ABAC + RLS + tests aislamiento + FormRequest con authorize() |
| A02 Cryptographic Failures | TLS 1.3 only, Argon2id, Fernet/AES-256-GCM para datos sensibles en DB, secrets en Doppler |
| A03 Injection | Eloquent/PDO parameterized queries, HTMLPurifier, validación con FormRequest |
| A04 Insecure Design | Threat modeling (este doc), ADRs, principle of least privilege |
| A05 Security Misconfiguration | Config versionada, secrets fuera del repo, `APP_DEBUG=false` forzado en prod, headers de seguridad |
| A06 Vulnerable Components | Dependabot + `composer audit` + `pnpm audit` en CI, renovate weekly |
| A07 Authentication Failures | Rate limits login, bloqueo de cuenta, MFA disponible, password policy NIST |
| A08 Software & Data Integrity | Signed URLs en R2, JWT firmado con clave rotable, CSP con nonces |
| A09 Logging & Monitoring | Structured logs + Sentry + OTel + audit log inmutable |
| A10 SSRF | Allowlist de hosts para webhooks salientes, sin user-controlled URLs en requests server-side |

---

## 7. Headers HTTP de seguridad

Configurados en middleware global `SecurityHeaders`:

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY                              (o frame-ancestors en CSP)
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
Content-Security-Policy: <ver abajo>
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-site
```

### CSP del frontend Next.js

```
default-src 'self';
script-src 'self' 'nonce-{random}' https://js.stripe.com;
style-src 'self' 'nonce-{random}';
img-src 'self' data: https://*.r2.cloudflarestorage.com https://*.interna.app;
connect-src 'self' https://api.interna.app wss://api.interna.app https://*.ingest.sentry.io;
font-src 'self' data:;
frame-src https://js.stripe.com https://hooks.stripe.com;
frame-ancestors 'none';
form-action 'self';
base-uri 'self';
object-src 'none';
upgrade-insecure-requests;
```

Nonce generado por request (middleware Next.js). Nada de `'unsafe-inline'` o `'unsafe-eval'`.

---

## 8. Secrets y configuración

- **Nunca** secrets en `.env` committed.
- `.env.example` con todas las variables pero valores placeholder.
- Producción: **Doppler** (free 5 seats) o Railway env vars cifradas.
- CI: GitHub Actions secrets.
- Rotación: API keys cada 90 días (calendario), inmediatamente al sospechar compromiso.
- **Separación de secrets por entorno:** dev, staging, prod. Ningún dev tiene credenciales de prod salvo el dueño.

Keys críticas con rotación:
- `APP_KEY` (Laravel) — encryption seed
- Sanctum signing key
- Claude API key
- R2 access keys
- Stripe keys
- OAuth client secrets

---

## 9. Audit log

Tabla `activity_log` (tipo Spatie) con:

```sql
CREATE TABLE activity_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL,
    log_name      VARCHAR(50),          -- 'auth', 'task', 'evaluation', ...
    description   TEXT,
    subject_type  VARCHAR(100),         -- 'App\\Modules\\Tasks\\Domain\\Task'
    subject_id    UUID,
    causer_type   VARCHAR(100),         -- 'App\\Modules\\Identity\\Domain\\User'
    causer_id     UUID,
    event         VARCHAR(50),          -- 'created', 'updated', 'deleted', 'signed_in', ...
    properties    JSONB,                -- diff de campos antes/después
    ip_address    INET,
    user_agent    TEXT,
    request_id    VARCHAR(36),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_tenant_created ON activity_log (tenant_id, created_at DESC);
CREATE INDEX idx_activity_subject ON activity_log (subject_type, subject_id);
CREATE INDEX idx_activity_causer ON activity_log (causer_type, causer_id);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON activity_log
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Inmutabilidad: revocar UPDATE/DELETE del rol app
REVOKE UPDATE, DELETE ON activity_log FROM interna_app;
```

Eventos auditados mínimo:
- Login/logout, fallos de login, cambios de password, MFA enable/disable
- Crear/actualizar/eliminar: `Task`, `Evaluation`, `User`, `Role`, `Permission`, `Tenant setting`
- Cambios de permisos y asignaciones de rol
- Exports de datos
- Accesos a reportes de universidad

Retención: **2 años** en DB activa, archivado a R2 después.

---

## 10. Logs aplicativos

- **Formato:** JSON estructurado con `tenant_id`, `user_id`, `request_id`, `trace_id`.
- **Redacción:** filtro de campos sensibles (`password`, `token`, `secret`, `card`, `ssn`, etc.). Laravel logger custom que aplica `Arr::forget` antes de serializar.
- **Nunca** loggear: passwords, tokens completos, payloads IA con PII, números completos de documentos oficiales.
- **Niveles:** DEBUG solo en dev, INFO default, WARN/ERROR a Sentry + Loki.

---

## 11. Integridad de datos sensibles en DB

Campos con PII o financieros **cifrados en columna**:

```php
// app/Modules/Identity/Domain/User.php
protected $casts = [
    'national_id'    => 'encrypted',   // AES-256-GCM con APP_KEY
    'phone'          => 'encrypted',
    'birth_date'     => 'encrypted:date',
];
```

- Encryption at rest adicional: Railway/GCP maneja a nivel disco (AES-256).
- Backups: cifrados, retenidos 30 días, restore testeado trimestralmente.

### Derecho al olvido (LGPD/GDPR-ready)

Soft delete inicial → hard delete + anonimización en PII tras 90 días (job mensual):

```sql
UPDATE users
SET email = 'deleted-{id}@anonymized.invalid',
    national_id = NULL,
    phone = NULL
WHERE deleted_at < now() - interval '90 days';
```

El `activity_log` mantiene la trazabilidad histórica referenciando el `causer_id` (UUID no reversible).

---

## 12. Seguridad de la IA

### Prompt injection

- **No concatenar** datos del usuario directo en el prompt sin delimitadores.
- Usar system prompts para roles, user messages para datos, con etiquetas XML: `<data>...</data>`, `<instruction>...</instruction>`.
- Validación de output: respuestas IA pasan por un filtro que no acepta acciones (solo texto).
- Rate limit por tenant + quota diaria por plan para limitar costo de abuso.

### Datos a Claude API

- Solo se envían datos del tenant en llamadas con el tenant context.
- Anthropic **no usa API data para entrenar** (política confirmada). Se loggea qué se envía en `ai_request_log` (anonimizado).
- Tenant puede **opt-out total** de IA → flag `settings.ai_enabled = false` en tabla `tenants`.

---

## 13. Seguridad en deploy y CI

- GitHub Actions con `permissions: { contents: read }` por defecto.
- Solo el workflow `deploy.yml` tiene acceso a secrets de prod.
- `main` protegido: requiere PR, 0 fails en tests/lint, 0 conflicts.
- Container scanning: `trivy` sobre imágenes antes de push a registry.
- Secrets scanning: `gitleaks` en pre-commit hook.

---

## 14. Response plan ante incidente

Documento separado `docs/runbooks/incident-response.md` (crear en FASE 5), pero los mínimos:

1. **Detección:** Sentry alerta + Grafana alert rules.
2. **Contención:** kill switch por tenant (`tenant.status = 'suspended'`), revocación de tokens masiva.
3. **Erradicación:** fix + deploy + rotar credenciales potencialmente expuestas.
4. **Recuperación:** restore de backup si hay corrupción.
5. **Lecciones:** post-mortem blameless en `docs/postmortems/` dentro de 7 días.
6. **Comunicación:** email a tenants afectados en <24h si hay data breach.

---

## 15. Checklist para cada PR de seguridad

- [ ] Nuevos endpoints: FormRequest + Policy + rate limit.
- [ ] Nuevas queries: usan Eloquent con scope tenant, no raw SQL con interpolación.
- [ ] Nuevos campos sensibles: cast `encrypted`.
- [ ] Uploads: MIME check, size limit, re-encode, pre-signed URL.
- [ ] Output HTML: escapado o purificado.
- [ ] Secrets: fuera del código, en Doppler.
- [ ] Dependencies: `composer audit` y `pnpm audit` limpios.
- [ ] Tests de autorización (roles permitidos + roles NO permitidos).
- [ ] Audit log cubre la operación si aplica.
