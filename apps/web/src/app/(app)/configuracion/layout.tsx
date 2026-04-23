'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

const NAV: Array<{ href: string; label: string; icon: IconName; section: string }> = [
  { href: '/configuracion/perfil', label: 'Mi perfil', icon: 'People', section: 'Personal' },
  { href: '/configuracion/notificaciones', label: 'Notificaciones', icon: 'Bell', section: 'Personal' },

  { href: '/configuracion/empresa', label: 'Empresa', icon: 'Onboard', section: 'Workspace' },
  { href: '/configuracion/equipo', label: 'Usuarios y equipo', icon: 'People', section: 'Workspace' },
  { href: '/configuracion/roles', label: 'Roles y permisos', icon: 'Settings', section: 'Workspace' },
  { href: '/configuracion/integraciones', label: 'Integraciones', icon: 'Auto', section: 'Workspace' },
  { href: '/configuracion/facturacion', label: 'Facturación', icon: 'Attach', section: 'Workspace' },
]

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const sections = Array.from(new Set(NAV.map((n) => n.section)))

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
                {NAV.filter((n) => n.section === section).map((n) => {
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
