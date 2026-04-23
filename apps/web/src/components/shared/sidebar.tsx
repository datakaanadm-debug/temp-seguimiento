'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, CheckSquare, Calendar, BarChart3, Users, Target, Bell,
  FolderKanban, FileText, GraduationCap, Settings, Command as CmdIcon, Plus,
  Activity, UserCheck,
} from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { useUiStore } from '@/lib/stores/ui-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { MembershipRole } from '@/types/api'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const sectionsForRole = (role: MembershipRole | null | undefined): { title: string; items: NavItem[] }[] => {
  if (role === 'intern') {
    return [
      {
        title: 'Principal',
        items: [
          { href: '/mi-dia', label: 'Mi día', icon: Home },
          { href: '/tareas', label: 'Mis tareas', icon: CheckSquare },
          { href: '/reportes-diarios/hoy', label: 'Reporte diario', icon: Activity },
          { href: '/proyectos', label: 'Proyectos', icon: FolderKanban },
        ],
      },
      {
        title: 'Crecimiento',
        items: [
          { href: '/evaluaciones', label: 'Evaluaciones', icon: BarChart3 },
          { href: '/reportes', label: 'Reportes', icon: FileText },
        ],
      },
    ]
  }

  // Lead / HR / Mentor / Admin
  return [
    {
      title: 'Visión',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: Home },
        { href: '/practicantes', label: 'Practicantes', icon: Users },
      ],
    },
    {
      title: 'Operación',
      items: [
        { href: '/tareas', label: 'Tareas', icon: CheckSquare },
        { href: '/proyectos', label: 'Proyectos', icon: FolderKanban },
        { href: '/reportes-diarios', label: 'Reportes diarios', icon: Activity },
      ],
    },
    {
      title: 'Desempeño',
      items: [
        { href: '/evaluaciones', label: 'Evaluaciones', icon: Target },
        { href: '/reportes', label: 'Reportes', icon: FileText },
        { href: '/reportes/universidad/solicitar', label: 'Reporte universidad', icon: GraduationCap },
      ],
    },
    ...(role === 'tenant_admin' || role === 'hr'
      ? [{
          title: 'Configuración',
          items: [
            { href: '/configuracion/equipo', label: 'Equipo', icon: UserCheck },
            { href: '/configuracion/scorecards', label: 'Scorecards', icon: BarChart3 },
            { href: '/configuracion/templates-reportes', label: 'Templates', icon: FileText },
          ],
        }]
      : []),
  ]
}

export function Sidebar() {
  const pathname = usePathname()
  const { user, tenant } = useAuth()
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen)
  const sections = sectionsForRole(user?.role)

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Brand */}
      <div className="flex h-14 items-center px-4 border-b">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
            i
          </div>
          {!collapsed && <span className="truncate">{tenant?.name ?? 'Interna'}</span>}
        </Link>
      </div>

      {/* Actions */}
      <div className="px-2 py-3 space-y-1">
        <Button
          variant="outline"
          size="sm"
          className={cn('w-full justify-start gap-2', collapsed && 'justify-center')}
          onClick={() => setCommandPaletteOpen(true)}
        >
          <CmdIcon className="h-4 w-4" />
          {!collapsed && (
            <>
              <span className="text-muted-foreground">Buscar…</span>
              <kbd className="ml-auto text-[10px] text-muted-foreground">⌘K</kbd>
            </>
          )}
        </Button>
        <Button size="sm" className={cn('w-full justify-start gap-2', collapsed && 'justify-center')} asChild>
          <Link href="/tareas/nueva">
            <Plus className="h-4 w-4" />
            {!collapsed && <span>Nueva tarea</span>}
          </Link>
        </Button>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {sections.map((section, i) => (
          <div key={section.title} className={cn(i > 0 && 'mt-4')}>
            {!collapsed && (
              <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground/70 hover:bg-accent hover:text-accent-foreground',
                        collapsed && 'justify-center',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Notifications link */}
      <Separator />
      <div className="p-2">
        <Link
          href="/notificaciones"
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent',
            collapsed && 'justify-center',
          )}
        >
          <Bell className="h-4 w-4" />
          {!collapsed && <span>Notificaciones</span>}
        </Link>
      </div>
    </aside>
  )
}
