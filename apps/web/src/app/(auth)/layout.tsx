/**
 * Pre-login: el layout muestra branding de plataforma (Senda), no del tenant.
 * Razón: en /login, /accept-invitation etc. todavía no hay sesión ni tenant
 * resuelto y no existe un endpoint público `branding-by-slug` (los logos vía
 * /api/v1/tenants/{id}/logo van por UUID, no por subdomain). Una vez logueado
 * el sidebar sí muestra `tenant.theme.logo_url` con fallback a la inicial.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh grid place-items-center bg-muted/30 p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-serif italic font-semibold">
            s
          </div>
          <div>
            <div className="text-xl font-semibold">Senda</div>
            <div className="text-xs text-muted-foreground">Gestión de practicantes</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
