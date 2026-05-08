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
import { TaskFilters } from '@/features/tasks/components/task-filters'
import { Can } from '@/components/shared/can'
import { useAuth } from '@/providers/auth-provider'
import { cn } from '@/lib/utils'
import type { TaskPriority, TaskState } from '@/types/api'

type View = 'kanban' | 'list' | 'timeline' | 'cal'

const VIEW_OPTIONS: Array<{ id: View; label: string }> = [
  { id: 'kanban', label: 'Kanban' },
  { id: 'list', label: 'Lista' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'cal', label: 'Calendario' },
]

export default function TareasPage() {
  const { user } = useAuth()
  const [view, setView] = useQueryState(
    'view',
    parseAsStringLiteral(['kanban', 'list', 'timeline', 'cal'] as const).withDefault('kanban'),
  )
  const [projectId, setProjectId] = useQueryState('project_id', parseAsString)
  const [mine, setMine] = useQueryState('mine', parseAsBoolean.withDefault(false))
  const [state, setState] = useQueryState('state', parseAsString)
  const [priority, setPriority] = useQueryState('priority', parseAsString)
  const [assigneeId, setAssigneeId] = useQueryState('assignee_id', parseAsString)
  const [q, setQ] = useQueryState('q', parseAsString)

  const params = {
    project_id: projectId ?? undefined,
    mine: mine || undefined,
    state: (state as TaskState | null) ?? undefined,
    priority: (priority as TaskPriority | null) ?? undefined,
    assignee_id: assigneeId ?? undefined,
    q: q ?? undefined,
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
        kicker={
          mine
            ? 'Mis tareas asignadas'
            : user?.role === 'intern' || user?.role === 'mentor'
              ? 'Tareas visibles para ti'
              : projectId
                ? 'Tareas del proyecto'
                : 'Todas las tareas del workspace'
        }
        title={
          mine
            ? 'Mis tareas'
            : user?.role === 'intern'
              ? 'Mis tareas y las que te incluyen'
              : 'Tareas'
        }
        sub={
          user?.role === 'intern'
            ? 'Solo verás tareas que te asignaron, donde eres revisor o estás como observador. Cambia de vista arriba.'
            : 'Arrastra entre columnas para cambiar de estado · cambia de vista arriba'
        }
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
            <TaskFilters
              value={{
                state: (state as TaskState | null) ?? null,
                priority: (priority as TaskPriority | null) ?? null,
                assignee_id: assigneeId ?? null,
                project_id: projectId ?? null,
                q: q ?? null,
              }}
              onChange={(v) => {
                setState(v.state)
                setPriority(v.priority)
                setAssigneeId(v.assignee_id)
                setProjectId(v.project_id)
                setQ(v.q)
              }}
            />
            <Can capability="create_tasks">
              <Link
                href="/tareas/nueva"
                className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
              >
                <Icon.Plus size={13} />
                Nueva tarea
              </Link>
            </Can>
          </>
        }
      />

      {/* Filter chips */}
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        {projectId && <PaperBadge tone="accent">Proyecto activo</PaperBadge>}
        {mine && <PaperBadge tone="neutral">Mis tareas</PaperBadge>}
        {state && (
          <button
            type="button"
            onClick={() => setState(null)}
            className="inline-flex items-center gap-1 rounded-full border border-paper-line bg-paper-raised px-2 py-[2px] text-[11px] text-ink-2 hover:border-paper-line-soft"
          >
            Estado: {state} ×
          </button>
        )}
        {priority && (
          <button
            type="button"
            onClick={() => setPriority(null)}
            className="inline-flex items-center gap-1 rounded-full border border-paper-line bg-paper-raised px-2 py-[2px] text-[11px] text-ink-2 hover:border-paper-line-soft"
          >
            Prioridad: {priority} ×
          </button>
        )}
        {assigneeId && (
          <button
            type="button"
            onClick={() => setAssigneeId(null)}
            className="inline-flex items-center gap-1 rounded-full border border-paper-line bg-paper-raised px-2 py-[2px] text-[11px] text-ink-2 hover:border-paper-line-soft"
          >
            Asignado ×
          </button>
        )}
        {q && (
          <button
            type="button"
            onClick={() => setQ(null)}
            className="inline-flex items-center gap-1 rounded-full border border-paper-line bg-paper-raised px-2 py-[2px] text-[11px] text-ink-2 hover:border-paper-line-soft"
          >
            "{q}" ×
          </button>
        )}
        <span className="ml-auto font-mono text-[10.5px] text-ink-3">
          ÚLTIMA SYNC · {syncLabel}
        </span>
      </div>

      {view === 'kanban' && (
        <KanbanBoard
          projectId={projectId ?? undefined}
          filters={{
            state: (state as TaskState | null) ?? null,
            priority,
            assignee_id: assigneeId,
            q,
            mine,
          }}
        />
      )}
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
