# Módulo Identity

Dominio fundacional: auth, tenants, usuarios, invitaciones, memberships, OAuth.

## Responsabilidades

- Alta de tenants nuevos.
- Auth por email + password y Google OAuth (fase 2 SAML/OIDC).
- Flujo de invitación: admin/HR invitan → email con token → invitado acepta + crea user + membership.
- Revocación de invitaciones.
- Gestión de sesión (login/logout/me).
- Registro de última actividad y auditoría de login.

## Estructura

```
app/Modules/Identity/
├── Domain/
│   ├── Enums/                TenantPlan, TenantStatus, MembershipRole, MembershipStatus
│   ├── Events/               TenantCreated, UserInvited, UserActivated, UserLoggedIn
│   ├── Exceptions/           InvitationInvalid, TenantSlugTaken
│   ├── Tenant.php            root del sistema (sin tenant_id)
│   ├── User.php              global (membership define tenancy)
│   ├── Membership.php
│   ├── Invitation.php
│   └── OAuthProvider.php
├── Application/
│   ├── Commands/             RegisterTenant, InviteUser, AcceptInvitation, RevokeInvitation
│   └── Services/             InvitationTokenService
├── Infrastructure/
│   ├── Listeners/            SendInvitationEmail (async), AuditUserLogin (sync)
│   └── Notifications/        InvitationNotification (email)
└── Http/
    ├── Controllers/          AuthController, TenantController, InvitationController
    ├── Requests/             LoginRequest, RegisterTenantRequest, InviteUserRequest, AcceptInvitationRequest
    ├── Resources/            TenantResource, UserResource, InvitationResource
    ├── Policies/             InvitationPolicy
    └── routes.php            incluido desde routes/api/v1.php
```

## Endpoints

| Método | Ruta | Auth | Rate limit | Descripción |
|---|---|---|---|---|
| POST | `/api/v1/tenants/register` | pre-auth | 3/min IP | Crea tenant nuevo + admin |
| GET | `/api/v1/tenant` | sanctum + member | — | Tenant actual |
| POST | `/api/v1/auth/login` | guest | 5/min email, 20/min IP | Login email+password |
| POST | `/api/v1/auth/logout` | sanctum | — | Logout |
| GET | `/api/v1/auth/me` | sanctum + member | — | User + tenant actual |
| GET | `/api/v1/invitations` | sanctum + member | — | Lista invitaciones del tenant |
| POST | `/api/v1/invitations` | sanctum + member + can:create | — | Crear invitación |
| DELETE | `/api/v1/invitations/{id}` | sanctum + can:revoke | — | Revocar invitación |
| POST | `/api/v1/invitations/accept` | pre-auth (token) | 10/min | Aceptar invitación con token |

## Flujo crítico: invitación

```
1. Admin POST /invitations  { email, role }
     → InviteUserHandler:
       - Revoca invitaciones previas pendientes del mismo email
       - Genera token aleatorio 64-char, guarda SHA-256
       - event(UserInvited) con $plainToken en payload
     → Listener SendInvitationEmail (async):
       - TenantContext::run(tenant_id, fn() => enviar email con link)

2. Invitado recibe email, clickea link:
   https://acme.interna.app/invitaciones/aceptar?token={64char}&email=...

3. Frontend llama POST /invitations/accept { token, email, name, password }
     → AcceptInvitationHandler (pre-auth; resuelve tenant desde invitation):
       - Verifica token (sha256 match), no expirado, no revocado, no aceptado, email match
       - Crea user si no existe
       - Crea membership con el role original
       - Marca invitación como accepted
       - event(UserActivated)

4. Invitado ahora puede hacer POST /auth/login
```

## Seguridad

- Passwords con Argon2id (Laravel default).
- Tokens de invitación: 64-char random, solo hash SHA-256 en DB.
- Rate limit por email + IP en login, por IP en register, por IP en accept.
- Verificación de pertenencia a tenant tras cada auth (middleware `tenant.member`).
- Audit log en todo login/logout/membership change (sync + async).

Ver [`docs/architecture/03-security.md`](../../../../../docs/architecture/03-security.md).

## Testing

Tests críticos:
- `tests/Feature/TenantIsolationTest.php` — aislamiento multi-tenant (bloqueante en CI)
- `tests/Feature/AuthFlowTest.php` — register, login, me
- `tests/Feature/InvitationFlowTest.php` — invitar, aceptar, revocar, casos edge

```bash
php artisan test --filter=TenantIsolation
php artisan test --filter=AuthFlow
php artisan test --filter=InvitationFlow
```

## Eventos emitidos

| Evento | Dispatch | Consumidores |
|---|---|---|
| `TenantCreated` | tras commit en `RegisterTenant` | (futuros: welcome email, analytics, billing init) |
| `UserInvited` | tras commit en `InviteUser` | `SendInvitationEmail` |
| `UserActivated` | tras commit en `AcceptInvitation` | (futuros: welcome email al tenant admin, analytics) |
| `UserLoggedIn` | en `AuthController::login` tras auth exitoso | `AuditUserLogin` |

## Decisiones de diseño específicas

- **Usuarios globales** (`users` sin `tenant_id`) — permite multi-tenant por user en fase 2 sin migración destructiva. En MVP cada user está en 1 solo tenant.
- **`memberships` es el link** user↔tenant con role + status. El primary role del user en el tenant actual se lee siempre de aquí.
- **Invitation token** se genera en el handler, se envía por email (evento carga el `plain_token`), nunca vive en DB.
- **`AcceptInvitation` corre pre-auth**: el que acepta no está logueado. El tenant se resuelve desde la invitación, no desde subdomain.
- **Google OAuth** implementado como `OAuthProvider` que vincula al `User` global (no al membership). Esto permite usar la misma cuenta Google para múltiples tenants en fase 2.

## TODO fase 2

- [ ] Controller `GoogleOAuthController` (redirect + callback)
- [ ] MFA/TOTP (tabla ya está, controller pendiente)
- [ ] SAML 2.0 / OIDC para Enterprise
- [ ] Magic link flow (generar → email → /magic-link/{token})
- [ ] Endpoint `GET /memberships` (si fase 2 multi-tenant por user)
