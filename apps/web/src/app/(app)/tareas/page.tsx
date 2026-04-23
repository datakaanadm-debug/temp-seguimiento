'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useQueryState, parseAsStringLiteral, parseAsString, parseAsBoolean } from 'nuqs'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperBadge } from '@/components/ui/primitives'
import { TaskListView } from '@/features/tasks/components/task-list-view'
import { KanbanBoard } from '@/features/tasks/components/kanban-board'
import { TaskTimelineView } from '@/features/tasks/components/task-timeline-view'
import { TaskCalendarView } from '@/features/tasks/components/task-calendar-view'
import { cn } from '@/lib/utils'

type View = 'kanban' | 'list' | 'timeline' | 'cal'

const VIEW_OPTIONS: Array<{ id: View; label: string }> = [
  { id: 'kanban', label: 'Kanban' },
  { id: 'list', label: 'Lista' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'cal', label: 'Calendario' },
]

export default function TareasPage() {
  const [view, setView] = useQueryState(
    'view',
    parseAsStringLiteral(['kanban', 'list', 'timeline', 'cal'] as const).withDefault('kanban'),
  )
  const [projectId] = useQueryState('project_id', parseAsString)
  const [mine, setMine] = useQueryState('mine', parseAsBoolean.withDefault(false))

  const params = {
    project_id: projectId ?? undefined,
    mine: mine || undefined,
    sort: 'updated_at' as const,
    dir: 'desc' as const,
    per_page: 100,
  }

  const [syncLabel, setSyncLabel] = useState('hace un momento')
  useEffect(() => {
    const id = setInterval(() => setSyncLabel((x) => x), 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="mx-auto max-w-[1360px] px-7 py-5 pb-10">
      <SectionTitle
        kicker="Espacio · todas las tareas"
        title="Tareas del equipo"
        sub="Arrastra entre columnas para cambiar de estado · cambia de vista arriba"
        right={
          <>
            <ViewToggle value={view} onChange={(v) => setView(v)} />
            <button
              type="button"
              onClick={() => setMine(!mine)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-[7px] text-[12px] font-medium transition',
                mine
                  ? 'border-primary-ink bg-primary text-primary-foreground'
                  : 'border-paper-line bg-paper-raised text-ink-2 hover:border-paper-line-soft',
              )}
            >
              <Icon.People size={13} />
              {mine ? 'Mis tareas' : 'Todas'}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] font-medium text-ink-2 hover:border-paper-line-soft"
            >
              <Icon.Filter size={13} />
              Filtros
            </button>
            <Link
              href="/tareas/nueva"
              className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
            >
              <Icon.Plus size={13} />
              Nueva tarea
            </Link>
          </>
        }
      />

      {/* Filter chips */}
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        {projectId && <PaperBadge tone="accent">Proyecto activo ×</PaperBadge>}
        {mine && <PaperBadge tone="neutral">Mis tareas ×</PaperBadge>}
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] text-ink-3 hover:bg-paper-bg-2 hover:text-ink"
        >
          <Icon.Plus size={11} />
          Añadir filtro
        </button>
        <span className="ml-auto font-mono text-[10.5px] text-ink-3">
          ÚLTIMA SYNC · {syncLabel}
        </span>
      </div>

      {view === 'kanban' && <KanbanBoard projectId={projectId ?? undefined} />}
      {view === 'list' && <TaskListView params={params} />}
      {view === 'timeline' && <TaskTimelineView params={params} />}
      {view === 'cal' && <TaskCalendarView params={params} />}
    </div>
  )
}

function ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  return (
    <div className="inline-flex rounded-md border border-paper-line bg-paper-raised p-0.5">
      {VIEW_OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-[4px] px-2.5 py-[5px] text-[12px] transition',
            value === o.id
              ? 'bg-paper-bg-2 font-semibold text-ink'
              : 'font-medium text-ink-3 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
