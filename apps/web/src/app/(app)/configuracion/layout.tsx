'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import type { MembershipRole } from '@/types/api'

interface NavItem {
  href: string
  label: string
  icon: IconName
  section: 'Personal' | 'Workspace'
  /** Roles que pueden ver este link. Si está vacío, todos. */
  roles?: MembershipRole[]
}

const NAV: NavItem[] = [
  // Personal — todos los roles
  { href: '/configuracion/perfil', label: 'Mi perfil', icon: 'People', section: 'Personal' },
  { href: '/configuracion/notificaciones', label: 'Notificaciones', icon: 'Bell', section: 'Personal' },

  // Workspace — solo staff. Filtros por rol granulares:
  //   - empresa, roles → solo tenant_admin
  //   - equipo, onboarding-plantilla → tenant_admin + hr (también gestionan)
  //
  // OCULTADOS del sidebar hasta tener integración real:
  //   - /configuracion/integraciones — toda la página es mock (Slack/Calendar/SSO
  //     sin OAuth). Reactivar cuando exista ≥1 conector funcional.
  //   - /configuracion/facturacion — todo mock (planes, facturas, downloads).
  //     Reactivar cuando Stripe/MercadoPago esté integrado.
  // Las rutas siguen existiendo para no romper bookmarks; cada una muestra
  // un banner "En desarrollo · datos de ejemplo" para evitar engañar al user.
  { href: '/configuracion/empresa', label: 'Empresa', icon: 'Onboard', section: 'Workspace',
    roles: ['tenant_admin'] },
  { href: '/configuracion/equipo', label: 'Usuarios y equipo', icon: 'People', section: 'Workspace',
    roles: ['tenant_admin', 'hr'] },
  { href: '/configuracion/roles', label: 'Roles y permisos', icon: 'Settings', section: 'Workspace',
    roles: ['tenant_admin'] },
  { href: '/configuracion/onboarding-plantilla', label: 'Plantilla de onboarding', icon: 'Onboard', section: 'Workspace',
    roles: ['tenant_admin', 'hr'] },
  { href: '/configuracion/scorecards', label: 'Scorecards de evaluación', icon: 'Eval', section: 'Workspace',
    roles: ['tenant_admin', 'hr'] },
  { href: '/configuracion/audit-log', label: 'Registro de actividad', icon: 'Clock', section: 'Workspace',
    roles: ['tenant_admin', 'supervisor'] },
]

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const role = user?.role ?? null

  // Filtrado por rol: si el item declara `roles`, debe incluir el del user.
  const visible = NAV.filter((n) => !n.roles || (role && n.roles.includes(role)))
  const sections = Array.from(new Set(visible.map((n) => n.section)))

  return (
    <div className="mx-auto max-w-[1200px] px-7 py-5 pb-10">
      <div className="grid gap-6" style={{ gridTemplateColumns: '220px 1fr' }}>
        <aside className="min-w-0">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
            Configuración
          </div>
          {sections.map((section) => (
            <div key={section} className="mb-4">
              <div className="mb-1.5 px-2 font-mono text-[10px] uppercase tracking-[0.5px] text-ink-muted">
                {section}
              </div>
              <nav>
                {visible.filter((n) => n.section === section).map((n) => {
                  const active = pathname === n.href || pathname.startsWith(n.href + '/')
                  const IconC = Icon[n.icon]
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition',
                        active
                          ? 'bg-primary-soft font-medium text-primary-ink'
                          : 'text-ink-2 hover:bg-paper-bg-2',
                      )}
                    >
                      <IconC size={14} />
                      {n.label}
                    </Link>
                  )
                })}
              </nav>
            </div>
          ))}
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
