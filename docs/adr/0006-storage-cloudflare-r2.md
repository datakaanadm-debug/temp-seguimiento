# ADR 0006 · Storage en Cloudflare R2

- **Estado:** Aceptado
- **Fecha:** 2026-04-22
- **Autor:** Arquitectura Senda
- **Contexto de decisión:** FASE 0

---

## Contexto

Senda almacena:
- Adjuntos de tareas (imágenes, PDFs, docs Office) — hasta 50MB por tarea.
- Avatares de usuarios.
- Reportes PDF generados (universidad, ejecutivos).
- Assets de branding por tenant (logo).

Usuarios están principalmente en LATAM (la primera ola). Se accede frecuentemente a adjuntos (previews en Kanban, descarga por equipos). Egress de AWS S3 São Paulo a Internet: $0.09/GB — prohibitivamente caro si hay volumen.

## Decisión

**Cloudflare R2** como object storage único para el MVP. API S3-compatible, usamos driver `s3` de Laravel/Flysystem con endpoint custom.

Estructura: bucket `interna-prod`, paths `/tenants/{tenant_id}/...`.

Acceso siempre vía **pre-signed URLs** generadas en backend con TTL 15 min para lectura, 5 min para upload.

## Consecuencias

**Positivas:**
- **Zero egress fees.** Factor crítico con usuarios LATAM activos abriendo adjuntos todo el día.
- Precio de storage competitivo (~$0.015/GB-mes vs. $0.023 S3).
- API S3-compatible → cambiar a AWS si algún día hace falta es trivial.
- Integración con Cloudflare CDN natural para assets públicos (logos).

**Negativas:**
- Latencia ligeramente mayor que S3 regional (R2 es multi-región). Aceptable para adjuntos; se mide si se vuelve issue.
- Políticas IAM menos granulares que S3. Mitigamos con pre-signed URLs siempre y ACL privado en el bucket.
- Backups cross-cloud (ej. a S3 US) requieren nuestro propio proceso; no es nativo.

## Alternativas consideradas

- **AWS S3 São Paulo:** descartado por egress cost. Útil si estuviéramos solo en AWS.
- **GCP Cloud Storage:** similar problema de egress a Internet. Justificable solo si GCP es también compute.
- **Supabase Storage:** bonito developer experience pero empuja hacia Supabase como DB.
- **Backblaze B2:** precios aún más bajos, pero ecosistema y SLA menos maduro para producción empresarial.

## Referencias

- `docs/architecture/02-multi-tenancy.md` sección 9
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Memoria `interna_stack.md`
