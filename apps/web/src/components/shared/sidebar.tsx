'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui/icon'
import { useAuth } from '@/providers/auth-provider'
import { useUiStore } from '@/lib/stores/ui-store'
import { cn, initialsFromName } from '@/lib/utils'
import type { MembershipRole } from '@/types/api'

type NavItem = {
  href: string
  label: string
  icon: IconName
  roles?: MembershipRole[]
}

const NAV: NavItem[] = [
  { href: '/mi-dia', label: 'Inicio', icon: 'Home', roles: ['intern'] },
  { href: '/dashboard', label: 'Inicio', icon: 'Home', roles: ['tenant_admin', 'hr', 'team_lead', 'mentor', 'supervisor'] },
  { href: '/tareas', label: 'Tareas', icon: 'Tasks' },
  { href: '/proyectos', label: 'Proyectos', icon: 'Panel' },
  { href: '/reportes-diarios', label: 'Bitácora', icon: 'Log' },
  { href: '/mentoria', label: 'Mentoría', icon: 'Mentor' },
  { href: '/evaluaciones', label: 'Evaluaciones', icon: 'Eval' },
  { href: '/okrs', label: 'OKRs', icon: 'Flag' },
  { href: '/analitica', label: 'Analítica', icon: 'Analytics', roles: ['tenant_admin', 'hr', 'team_lead', 'supervisor'] },
  { href: '/onboarding', label: 'Onboarding', icon: 'Onboard' },
  { href: '/logros', label: 'Logros', icon: 'Eval' },
  { href: '/practicantes', label: 'Personas', icon: 'People', roles: ['tenant_admin', 'hr', 'team_lead'] },
  { href: '/automatizacion', label: 'Automatización', icon: 'Auto', roles: ['tenant_admin', 'hr'] },
  { href: '/ia', label: 'Coach IA', icon: 'Sparkles' },
  { href: '/reportes', label: 'Reportes', icon: 'Download', roles: ['tenant_admin', 'hr', 'team_lead'] },
]

const isItemForRole = (item: NavItem, role?: MembershipRole | null) => {
  if (!item.roles) return true
  return role ? item.roles.includes(role) : false
}

export function Sidebar() {
  const pathname = usePathname()
  const { user, tenant } = useAuth()
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen)

  const nav = NAV.filter((item) => isItemForRole(item, user?.role))

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-paper-line bg-paper-surface transition-[width] duration-200',
        collapsed ? 'w-[72px]' : 'w-[248px]',
      )}
    >
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-paper-line-soft px-4">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink text-paper-surface font-serif italic"
          style={{ fontSize: 15, lineHeight: 1 }}
          aria-hidden
        >
          i
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-ink">
              {tenant?.name ?? 'Interna'}
            </div>
            <div className="text-[10px] uppercase tracking-[0.6px] text-ink-3 font-mono">
              {tenant?.plan ?? 'workspace'}
            </div>
          </div>
        )}
      </div>

      {/* Search + new */}
      <div className="flex flex-col gap-1.5 px-3 pt-3">
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className={cn(
            'flex h-9 items-center gap-2 rounded-md border border-paper-line bg-paper-raised px-2.5 text-[13px] text-ink-3 transition hover:border-paper-line-soft hover:bg-paper-surface',
            collapsed ? 'justify-center' : 'justify-between',
          )}
        >
          <span className="flex items-center gap-2">
            <Icon.Search size={14} />
            {!collapsed && <span>Buscar o saltar</span>}
          </span>
          {!collapsed && (
            <kbd className="font-mono text-[10px] text-ink-3">⌘K</kbd>
          )}
        </button>
        <Link
          href="/tareas/nueva"
          className={cn(
            'flex h-9 items-center gap-2 rounded-md bg-ink px-2.5 text-[13px] font-medium text-paper-surface transition hover:bg-ink-2',
            collapsed ? 'justify-center' : 'justify-start',
          )}
        >
          <Icon.Plus size={14} />
          {!collapsed && <span>Nueva tarea</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const IconC = Icon[item.icon]
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
                    active
                      ? 'bg-primary-soft text-primary-ink font-medium'
                      : 'text-ink-2 hover:bg-paper-bg-2',
                    collapsed && 'justify-center px-0',
                  )}
                >
                  <IconC size={15} className="shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User chip at bottom */}
      <div className="border-t border-paper-line-soft p-3">
        <Link
          href="/configuracion/perfil"
          className={cn(
            'flex items-center gap-2.5 rounded-md px-2 py-2 transition hover:bg-paper-bg-2',
            collapsed && 'justify-center px-0',
          )}
        >
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
            style={{
              background: 'hsl(var(--accent-soft))',
              color: 'hsl(var(--accent-ink))',
              border: '1px solid hsl(var(--accent-h) / 0.3)',
            }}
          >
            {initialsFromName(user?.name ?? user?.email ?? '?')}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-medium text-ink">
                {user?.name ?? user?.email}
              </div>
              <div className="truncate text-[10px] text-ink-3">{user?.role_label}</div>
            </div>
          )}
        </Link>
      </div>
    </aside>
  )
}
