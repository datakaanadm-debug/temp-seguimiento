'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Icon } from '@/components/ui/icon'
import { useAuth } from '@/providers/auth-provider'
import { useUiStore } from '@/lib/stores/ui-store'
import { apiClient } from '@/lib/api-client'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { initialsFromName, cn } from '@/lib/utils'
import { useConnectionStatus } from '@/hooks/use-connection-status'
import { clearTenantSlug } from '@/lib/tenant'
import { useTour } from '@/features/onboarding/tour/use-tour'
import { NotificationsBell } from '@/features/notifications/components/notifications-bell'

const ROUTE_LABELS: Record<string, string> = {
  'mi-dia': 'Mi día',
  dashboard: 'Inicio',
  tareas: 'Tareas',
  nueva: 'Nueva',
  'reportes-diarios': 'Bitácora',
  hoy: 'Hoy',
  evaluaciones: 'Evaluaciones',
  mentoria: 'Mentoría',
  analitica: 'Analítica',
  onboarding: 'Onboarding',
  practicantes: 'Personas',
  automatizacion: 'Automatización',
  reportes: 'Reportes',
  universidad: 'Universidad',
  solicitar: 'Solicitar',
  notificaciones: 'Notificaciones',
  configuracion: 'Configuración',
  perfil: 'Mi perfil',
  equipo: 'Equipo',
}

function useBreadcrumbs() {
  const pathname = usePathname()
  const segs = pathname.split('/').filter(Boolean)
  return segs.map((seg, i) => ({
    label: ROUTE_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1),
    href: '/' + segs.slice(0, i + 1).join('/'),
    last: i === segs.length - 1,
  }))
}

export function Topbar() {
  const router = useRouter()
  const { user, tenant, setUser, setTenant } = useAuth()
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen)
  const connectionStatus = useConnectionStatus()
  const crumbs = useBreadcrumbs()
  const tour = useTour()

  const handleLogout = async () => {
    try { await apiClient.post('/api/v1/auth/logout') } catch { /* noop */ }
    clearTenantSlug()
    setUser(null)
    setTenant(null)
    router.push('/login')
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-paper-line bg-paper-surface px-4">
      <button
        type="button"
        onClick={toggleSidebar}
        className="flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-paper-bg-2 hover:text-ink"
        aria-label="Toggle sidebar"
      >
        <Icon.Panel size={16} />
      </button>

      {/* Breadcrumbs */}
      <nav className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink-3">
        <Link href="/" className="hover:text-ink">{tenant?.name ?? 'Senda'}</Link>
        {crumbs.map((c) => (
          <span key={c.href} className="flex items-center gap-1.5">
            <Icon.Chev size={11} className="text-ink-muted" />
            {c.last ? (
              <span className="truncate text-ink">{c.label}</span>
            ) : (
              <Link href={c.href} className="hover:text-ink">{c.label}</Link>
            )}
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden md:flex h-8 items-center gap-2 rounded-md border border-paper-line bg-paper-raised px-2.5 text-[12px] text-ink-3 hover:border-paper-line-soft"
        >
          <Icon.Search size={12} />
          <span>Buscar</span>
          <kbd className="font-mono text-[10px]">⌘K</kbd>
        </button>

        <ConnectionDot status={connectionStatus} />

        <NotificationsBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 items-center gap-2 rounded-md px-1.5 hover:bg-paper-bg-2"
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
              <Icon.ChevDown size={11} className="text-ink-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="text-[11px] text-ink-3 font-mono uppercase tracking-wide">Sesión en</div>
              <div className="text-[13px] font-semibold text-ink">{tenant?.name}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/configuracion/perfil" className="gap-2">
                <Icon.People size={14} />
                Mi perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/configuracion/notificaciones" className="gap-2">
                <Icon.Settings size={14} />
                Preferencias
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => tour.start()} className="gap-2">
              <Icon.Sparkles size={14} />
              Hacer tour de bienvenida
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="gap-2">
              <Icon.LogOut size={14} />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

function ConnectionDot({ status }: { status: string }) {
  const [color, label] = (() => {
    switch (status) {
      case 'connected':
        return ['bg-success', 'Conectado'] as const
      case 'connecting':
      case 'unavailable':
      case 'initializing':
        return ['bg-warning animate-pulse', 'Reconectando'] as const
      default:
        return ['bg-destructive', 'Sin conexión'] as const
    }
  })()
  return (
    <span className="hidden items-center gap-1.5 text-[11px] text-ink-3 md:flex" title={label}>
      <span className={cn('h-2 w-2 rounded-full', color)} />
    </span>
  )
}
