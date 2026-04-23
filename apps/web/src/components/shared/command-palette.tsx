'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  Home, CheckSquare, Users, BarChart3, FileText, GraduationCap, Plus, Activity,
  Bell, FolderKanban,
} from 'lucide-react'
import { useUiStore } from '@/lib/stores/ui-store'
import { useAuth } from '@/providers/auth-provider'
import { cn } from '@/lib/utils'

type Cmd = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  keywords?: string[]
  section: 'acciones' | 'ir a'
}

export function CommandPalette() {
  const router = useRouter()
  const open = useUiStore((s) => s.commandPaletteOpen)
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen)
  const { user } = useAuth()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!open)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  const run = (fn: () => void) => {
    setOpen(false)
    fn()
  }

  const commands: Cmd[] = [
    {
      id: 'new-task',
      label: 'Nueva tarea',
      icon: Plus,
      action: () => run(() => router.push('/tareas/nueva')),
      keywords: ['crear', 'tarea', 'nueva'],
      section: 'acciones',
    },
    {
      id: 'new-daily',
      label: 'Enviar reporte diario',
      icon: Activity,
      action: () => run(() => router.push('/reportes-diarios/hoy')),
      keywords: ['reporte', 'diario', 'bitácora'],
      section: 'acciones',
    },
    {
      id: 'go-home',
      label: user?.role === 'intern' ? 'Mi día' : 'Dashboard',
      icon: Home,
      action: () => run(() => router.push(user?.role === 'intern' ? '/mi-dia' : '/dashboard')),
      section: 'ir a',
    },
    { id: 'go-tasks', label: 'Tareas', icon: CheckSquare, action: () => run(() => router.push('/tareas')), section: 'ir a' },
    { id: 'go-projects', label: 'Proyectos', icon: FolderKanban, action: () => run(() => router.push('/proyectos')), section: 'ir a' },
    { id: 'go-interns', label: 'Practicantes', icon: Users, action: () => run(() => router.push('/practicantes')), section: 'ir a' },
    { id: 'go-evaluations', label: 'Evaluaciones', icon: BarChart3, action: () => run(() => router.push('/evaluaciones')), section: 'ir a' },
    { id: 'go-reports', label: 'Reportes', icon: FileText, action: () => run(() => router.push('/reportes')), section: 'ir a' },
    { id: 'go-university', label: 'Reporte de universidad', icon: GraduationCap, action: () => run(() => router.push('/reportes/universidad/solicitar')), section: 'ir a' },
    { id: 'go-notifs', label: 'Notificaciones', icon: Bell, action: () => run(() => router.push('/notificaciones')), section: 'ir a' },
  ]

  const grouped: Record<string, Cmd[]> = {}
  for (const c of commands) (grouped[c.section] ??= []).push(c)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 animate-fade-in"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <Command
        className="mx-auto mt-[10vh] w-full max-w-xl rounded-lg border bg-popover text-popover-foreground shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        label="Command menu"
      >
        <Command.Input
          placeholder="Buscar acciones o páginas…"
          className="w-full px-4 py-3 text-sm border-b outline-none bg-transparent"
        />
        <Command.List className="max-h-[400px] overflow-y-auto p-2">
          <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
            Sin resultados.
          </Command.Empty>
          {Object.entries(grouped).map(([section, items]) => (
            <Command.Group
              key={section}
              heading={section}
              className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5"
            >
              {items.map((c) => (
                <Command.Item
                  key={c.id}
                  onSelect={c.action}
                  value={`${c.label} ${(c.keywords ?? []).join(' ')}`}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm cursor-pointer',
                    'aria-selected:bg-accent aria-selected:text-accent-foreground',
                  )}
                >
                  <c.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{c.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command>
    </div>
  )
}
