'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { useQuery } from '@tanstack/react-query'
import { Icon, type IconName } from '@/components/ui/icon'
import { Kbd } from '@/components/ui/primitives'
import { useUiStore } from '@/lib/stores/ui-store'
import { useAuth } from '@/providers/auth-provider'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface SearchResult {
  type: 'task' | 'project' | 'person' | 'okr'
  id: string
  title: string
  subtitle: string
  url: string
  icon: IconName
}

type Section = 'Acciones rápidas' | 'Ir a' | 'Herramientas'

type Cmd = {
  id: string
  label: string
  icon: IconName
  action: () => void
  keywords?: string
  section: Section
  shortcut?: string[]
  hint?: string
}

export function CommandPalette() {
  const router = useRouter()
  const open = useUiStore((s) => s.commandPaletteOpen)
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen)
  const { user } = useAuth()

  // Búsqueda con debounce 200ms — el query backend es ligero pero no
  // queremos pegarle por cada keystroke.
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200)
    return () => clearTimeout(t)
  }, [query])

  // Reset el query al cerrar la palette
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const { data: searchData, isFetching } = useQuery({
    queryKey: ['cmdk-search', debounced],
    queryFn: () =>
      apiClient.get<{ results: SearchResult[] }>('/api/v1/search', {
        searchParams: { q: debounced },
      }),
    enabled: open && debounced.length >= 2,
    staleTime: 30_000,
  })
  const searchResults: SearchResult[] = searchData?.results ?? []

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!open)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  const run = (fn: () => void) => {
    setOpen(false)
    // small timeout para que cmdk cierre antes de navegar
    setTimeout(fn, 10)
  }

  const homeHref = user?.role === 'intern' ? '/mi-dia' : '/dashboard'
  const homeLabel = user?.role === 'intern' ? 'Mi día' : 'Inicio'

  const commands: Cmd[] = [
    // Acciones rápidas
    {
      id: 'new-task',
      label: 'Nueva tarea',
      icon: 'Plus',
      action: () => run(() => router.push('/tareas/nueva')),
      keywords: 'crear tarea nueva add create',
      section: 'Acciones rápidas',
      shortcut: ['N', 'T'],
    },
    {
      id: 'new-daily',
      label: 'Reportar mi día',
      icon: 'Log',
      action: () => run(() => router.push('/reportes-diarios/hoy')),
      keywords: 'reporte diario bitácora standup',
      section: 'Acciones rápidas',
      shortcut: ['R'],
    },
    {
      id: 'start-timer',
      label: 'Iniciar timer en una tarea',
      icon: 'Clock',
      action: () => run(() => router.push('/tareas?view=list&mine=true')),
      keywords: 'timer tiempo start play',
      section: 'Acciones rápidas',
    },
    {
      id: 'new-evaluation',
      label: 'Nueva evaluación',
      icon: 'Eval',
      action: () => run(() => router.push('/evaluaciones?new=true')),
      keywords: 'evaluación scorecard performance',
      section: 'Acciones rápidas',
    },

    // Ir a
    {
      id: 'go-home',
      label: homeLabel,
      icon: 'Home',
      action: () => run(() => router.push(homeHref)),
      section: 'Ir a',
      shortcut: ['G', 'H'],
    },
    {
      id: 'go-tasks',
      label: 'Tareas',
      icon: 'Tasks',
      action: () => run(() => router.push('/tareas')),
      section: 'Ir a',
      shortcut: ['G', 'T'],
    },
    {
      id: 'go-tasks-kanban',
      label: 'Tareas · vista Kanban',
      icon: 'Panel',
      action: () => run(() => router.push('/tareas?view=kanban')),
      keywords: 'tablero board kanban',
      section: 'Ir a',
    },
    {
      id: 'go-tasks-cal',
      label: 'Tareas · vista Calendario',
      icon: 'Cal',
      action: () => run(() => router.push('/tareas?view=cal')),
      keywords: 'calendario fechas',
      section: 'Ir a',
    },
    {
      id: 'go-log',
      label: 'Bitácora',
      icon: 'Log',
      action: () => run(() => router.push('/reportes-diarios')),
      section: 'Ir a',
      shortcut: ['G', 'B'],
    },
    {
      id: 'go-mentor',
      label: 'Mentoría',
      icon: 'Mentor',
      action: () => run(() => router.push('/mentoria')),
      section: 'Ir a',
    },
    {
      id: 'go-evaluations',
      label: 'Evaluaciones',
      icon: 'Eval',
      action: () => run(() => router.push('/evaluaciones')),
      section: 'Ir a',
      shortcut: ['G', 'E'],
    },
    {
      id: 'go-people',
      label: 'Personas / Practicantes',
      icon: 'People',
      action: () => run(() => router.push('/practicantes')),
      keywords: 'personas equipo practicantes',
      section: 'Ir a',
    },
    {
      id: 'go-analytics',
      label: 'Analítica',
      icon: 'Analytics',
      action: () => run(() => router.push('/analitica')),
      keywords: 'analytics métricas',
      section: 'Ir a',
    },
    {
      id: 'go-reports',
      label: 'Reportes',
      icon: 'Log',
      action: () => run(() => router.push('/reportes')),
      section: 'Ir a',
    },
    {
      id: 'go-university',
      label: 'Reporte de universidad',
      icon: 'Log',
      action: () => run(() => router.push('/reportes/universidad/solicitar')),
      keywords: 'universidad académico',
      section: 'Ir a',
    },
    {
      id: 'go-auto',
      label: 'Automatización',
      icon: 'Auto',
      action: () => run(() => router.push('/automatizacion')),
      keywords: 'workflow rules zapier',
      section: 'Ir a',
    },

    // Herramientas
    {
      id: 'notifs',
      label: 'Ver notificaciones',
      icon: 'Bell',
      action: () => run(() => router.push('/notificaciones')),
      section: 'Herramientas',
    },
    {
      id: 'profile',
      label: 'Mi perfil',
      icon: 'People',
      action: () => run(() => router.push('/configuracion/perfil')),
      section: 'Herramientas',
    },
    {
      id: 'settings',
      label: 'Configuración del equipo',
      icon: 'Settings',
      action: () => run(() => router.push('/configuracion/equipo')),
      section: 'Herramientas',
    },
  ]

  const grouped: Record<string, Cmd[]> = {}
  for (const c of commands) (grouped[c.section] ??= []).push(c)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 animate-fade-in bg-ink/50 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <Command
        className="mx-auto mt-[12vh] w-full max-w-[640px] overflow-hidden rounded-xl border border-paper-line bg-paper-raised shadow-paper-3"
        onClick={(e) => e.stopPropagation()}
        label="Paleta de comandos"
        loop
      >
        <div className="flex items-center gap-3 border-b border-paper-line-soft px-4 py-3">
          <Icon.Search size={15} className="text-ink-3" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Escribe un comando o busca tareas, personas, OKRs…"
            className="flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
            autoFocus
          />
          {isFetching && (
            <span className="font-mono text-[10px] text-ink-3" aria-label="Buscando">
              …
            </span>
          )}
          <Kbd>ESC</Kbd>
        </div>

        <Command.List className="max-h-[420px] overflow-y-auto p-2">
          <Command.Empty className="py-10 text-center text-[13px] text-ink-3">
            Sin resultados. Intenta otra palabra.
          </Command.Empty>

          {searchResults.length > 0 && (
            <Command.Group
              heading="Resultados"
              className="px-1.5 pt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.6px] text-ink-3 first:pt-0 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1"
            >
              {searchResults.map((r) => {
                const IconC = Icon[r.icon] ?? Icon.Search
                return (
                  <Command.Item
                    key={`${r.type}-${r.id}`}
                    onSelect={() => run(() => router.push(r.url))}
                    value={`${r.title} ${r.subtitle} ${r.type}`}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-[13px] text-ink',
                      'aria-selected:bg-primary-soft aria-selected:text-primary-ink',
                    )}
                  >
                    <IconC size={15} className="shrink-0 text-ink-3 aria-selected:text-primary-ink" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{r.title}</span>
                      <span className="font-mono text-[10.5px] text-ink-3">{r.subtitle}</span>
                    </div>
                  </Command.Item>
                )
              })}
            </Command.Group>
          )}

          {Object.entries(grouped).map(([section, items]) => (
            <Command.Group
              key={section}
              heading={section}
              className="px-1.5 pt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.6px] text-ink-3 first:pt-0 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1"
            >
              {items.map((c) => {
                const IconC = Icon[c.icon]
                return (
                  <Command.Item
                    key={c.id}
                    onSelect={c.action}
                    value={`${c.label} ${c.keywords ?? ''}`}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-[13px] text-ink',
                      'aria-selected:bg-primary-soft aria-selected:text-primary-ink',
                    )}
                  >
                    <IconC size={15} className="shrink-0 text-ink-3 aria-selected:text-primary-ink" />
                    <span className="flex-1">{c.label}</span>
                    {c.shortcut && (
                      <span className="flex items-center gap-1">
                        {c.shortcut.map((k) => (
                          <Kbd key={k}>{k}</Kbd>
                        ))}
                      </span>
                    )}
                  </Command.Item>
                )
              })}
            </Command.Group>
          ))}
        </Command.List>

        <div className="flex items-center justify-between border-t border-paper-line-soft px-4 py-2 text-[11px] text-ink-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              Navegar
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd>
              Seleccionar
            </span>
          </div>
          <span className="flex items-center gap-1 font-mono">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
            para abrir
          </span>
        </div>
      </Command>
    </div>
  )
}
