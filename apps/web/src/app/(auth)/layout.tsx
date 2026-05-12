import { AuthProvider } from '@/providers/auth-provider'
import { getSessionServer } from '@/lib/auth/server'

/**
 * Pre-login: el layout muestra branding de plataforma (Senda), no del tenant.
 * Razón: en /login, /accept-invitation etc. todavía no hay sesión ni tenant
 * resuelto y no existe un endpoint público `branding-by-slug` (los logos vía
 * /api/v1/tenants/{id}/logo van por UUID, no por subdomain). Una vez logueado
 * el sidebar sí muestra `tenant.theme.logo_url` con fallback a la inicial.
 *
 * Wrapped en AuthProvider con session OPCIONAL: a diferencia de (app)/layout
 * que usa requireSession() y redirige, acá getSessionServer() devuelve null
 * sin redirigir. Eso permite que:
 *   - /login y /registro funcionen sin sesión (initialUser/Tenant=null).
 *   - /bienvenida (que corre POST-registro, ya autenticado) tenga acceso a
 *     useAuth() con el user real.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionServer()

  return (
    <AuthProvider initialUser={session?.user ?? null} initialTenant={session?.tenant ?? null}>
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
    </AuthProvider>
  )
}
