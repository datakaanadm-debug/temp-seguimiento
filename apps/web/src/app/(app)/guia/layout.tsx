'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import { GUIDE_MODULES } from '@/features/guide/data/modules'

/**
 * Layout de /guia con sidebar lateral listando los 14 módulos.
 * Acceso restringido: staff (admin/hr/lead/mentor/supervisor) — los
 * practicantes ya tienen el tour de /bienvenida que ven al ingresar.
 * No bloqueamos por rol acá (intern puede leer la guía si quiere), sólo
 * la entrada se gateía desde el sidebar global.
 */
export default function GuiaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-[1200px] px-7 py-5 pb-10">
      <div className="grid gap-6" style={{ gridTemplateColumns: '240px minmax(0, 1fr)' }}>
        <aside className="min-w-0">
          <Link
            href="/guia"
            className={cn(
              'mb-3 flex items-center gap-2 px-2 text-[13px] transition',
              pathname === '/guia' ? 'font-semibold text-ink' : 'text-ink-2 hover:text-ink',
            )}
          >
            <Icon.Home size={13} />
            Resumen general
          </Link>

          <div className="mb-1.5 px-2 font-mono text-[10px] uppercase tracking-[0.5px] text-ink-muted">
            Módulos
          </div>
          <nav className="space-y-0.5">
            {GUIDE_MODULES.map((m) => {
              const active = pathname === `/guia/${m.slug}`
              const IconC = Icon[m.icon]
              return (
                <Link
                  key={m.slug}
                  href={`/guia/${m.slug}`}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition',
                    active
                      ? 'bg-primary-soft font-medium text-primary-ink'
                      : 'text-ink-2 hover:bg-paper-bg-2',
                  )}
                >
                  <IconC size={14} />
                  {m.name}
                </Link>
              )
            })}
          </nav>

          <div className="mt-6 rounded-md border border-dashed border-paper-line bg-paper-surface p-3 text-[11.5px] leading-[1.5] text-ink-3">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.5px]">
              Tu rol
            </div>
            <div className="text-[12px] font-medium text-ink">
              {user?.role_label ?? '—'}
            </div>
            <p className="mt-2">
              Cada módulo marca qué roles lo utilizan. Si una acción no te aparece, probablemente tu rol no la permite.
            </p>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
