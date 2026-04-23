'use client'

import Link from 'next/link'
import { Icon } from '@/components/ui/icon'
import { PriorityDot, TonalAvatar, PaperBadge } from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useTasks } from '../hooks/use-tasks'
import { STATE_LABELS, PRIORITY_LABELS } from '../lib/state-machine'
import type { ListTasksParams } from '../api/keys'
import type { TaskState } from '@/types/api'

const GRID = 'grid-cols-[70px_1fr_140px_160px_110px_110px_100px_40px]'

const STATE_TONE: Record<TaskState, 'neutral' | 'info' | 'accent' | 'warn' | 'ok' | 'danger'> = {
  BACKLOG: 'neutral',
  TO_DO: 'info',
  IN_PROGRESS: 'accent',
  IN_REVIEW: 'warn',
  DONE: 'ok',
  BLOCKED: 'danger',
  CANCELLED: 'neutral',
}

export function TaskListView({ params }: { params: ListTasksParams }) {
  const { data, isLoading } = useTasks(params)
  const tasks = data?.data ?? []

  if (isLoading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-paper-line bg-paper-surface p-12 text-center">
        <p className="text-[13px] text-ink-3">No hay tareas que coincidan con estos filtros.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-paper-line bg-paper-raised">
      <div
        className={cn(
          'grid border-b border-paper-line px-3.5 py-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.3px] text-ink-3',
          GRID,
        )}
      >
        <span>ID</span>
        <span>Tarea</span>
        <span>Estado</span>
        <span>Asignado</span>
        <span>Prioridad</span>
        <span>Vence</span>
        <span>Tiempo</span>
        <span />
      </div>
      {tasks.map((task, i) => {
        const actualH = task.actual_minutes / 60
        const estH = task.estimated_minutes ? task.estimated_minutes / 60 : 0
        return (
          <Link
            key={task.id}
            href={`/tareas/${task.id}`}
            className={cn(
              'grid items-center px-3.5 py-2 text-[13px] transition hover:bg-paper-bg-2',
              GRID,
              i < tasks.length - 1 && 'border-b border-paper-line-soft',
            )}
          >
            <span className="font-mono text-[11px] text-ink-3">
              T-{task.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="truncate pr-2 font-medium text-ink">{task.title}</span>
            <span>
              <PaperBadge tone={STATE_TONE[task.state]}>
                {STATE_LABELS[task.state]}
              </PaperBadge>
            </span>
            <span className="flex items-center gap-2">
              {task.assignee ? (
                <>
                  <TonalAvatar
                    size={20}
                    name={task.assignee.name ?? task.assignee.email}
                  />
                  <span className="truncate text-[12px] text-ink-2">
                    {task.assignee.name?.split(' ')[0] ?? '—'}
                  </span>
                </>
              ) : (
                <span className="text-[12px] text-ink-muted">Sin asignar</span>
              )}
            </span>
            <span className="flex items-center gap-1.5 text-[12px] text-ink-2">
              <PriorityDot p={task.priority as any} />
              {PRIORITY_LABELS[task.priority]}
            </span>
            <span
              className={cn(
                'text-[12px]',
                task.is_overdue ? 'font-medium text-destructive' : 'text-ink-2',
              )}
            >
              {task.due_at ? formatDue(task.due_at) : '—'}
            </span>
            <span className="font-mono text-[11px] text-ink-3">
              {estH > 0 ? `${actualH.toFixed(1)}/${estH.toFixed(0)}h` : `${actualH.toFixed(1)}h`}
            </span>
            <Icon.Chev size={12} className="text-ink-muted" />
          </Link>
        )
      })}
    </div>
  )
}

function formatDue(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}
