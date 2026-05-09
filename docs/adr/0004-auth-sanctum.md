# ADR 0004 · Autenticación con Laravel Sanctum + cookies cross-subdomain

- **Estado:** Aceptado
- **Fecha:** 2026-04-22
- **Autor:** Arquitectura Senda
- **Contexto de decisión:** FASE 0

---

## Contexto

Senda tiene múltiples canales de clientes:
- Web browser (Next.js server + client components, mismo dominio raíz que API).
- Móvil nativo (fase 2, Expo).
- Integraciones server-to-server (API pública, fase 2).

Requisitos:
- CSRF protegido para web.
- Cookies httpOnly (evitar XSS).
- Revocación de sesión inmediata (logout desde otro dispositivo).
- Soporte futuro para SSO SAML/OIDC.
- No requiere JWT si no hay clientes externos (aun).

## Decisión

**Laravel Sanctum en modo stateful con cookies** para el canal web (Next.js ↔ API Laravel), en dominio raíz compartido `.interna.app` (web en `acme.interna.app`, API en `api.interna.app`).

Cookie: httpOnly, Secure, SameSite=Lax, scope `.interna.app`, 2h con rolling refresh.

Para mobile (fase 2): Sanctum Personal Access Tokens + refresh rotation.

Para integraciones server-to-server (fase 2): Personal Access Tokens con scope limitado, prefijo `int_live_`, revocables.

## Consecuencias

**Positivas:**
- Mismo Sanctum sirve los 3 canales con configuraciones distintas.
- Cookies httpOnly eliminan XSS-based token theft.
- CSRF token automático en mismo origin (`SameSite=Lax` permite POST desde navegación top-level tras OAuth).
- Revocación inmediata vía Redis denylist o borrado de sesión.

**Negativas:**
- Cookies cross-subdomain requieren que API y web compartan suffix público (`.interna.app`). Si algún día la API vive en otra TLD, hay que reconfigurar.
- Sanctum stateful depende de Redis para sesiones → si Redis cae, auth cae. Mitigado con Redis managed + alertas.
- No es JWT; integraciones externas B2B esperarán PAT, no OAuth 2.0 client credentials (fase 2 cuando exista demand).

## Alternativas consideradas

- **JWT puro** (Tymon/JWT): descartado por exposición a XSS si guardamos en localStorage; poner en cookie httpOnly elimina la ventaja sobre Sanctum.
- **Laravel Passport (OAuth 2.0):** over-engineering para MVP. Passport útil si publicamos API con muchos third-party; aun no.
- **Clerk/Auth0:** vendor lock-in + costo escalonado alto. Reservar para si el esfuerzo de mantener auth propio supera el beneficio.
- **NextAuth (authjs):** movería la verdad de sesión a Next.js; complica integrar con Laravel que también necesita saber el usuario.

## Referencias

- `docs/architecture/03-security.md` sección 2
- Laravel Sanctum docs
- OWASP session management cheat sheet
