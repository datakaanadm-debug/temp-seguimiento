'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useTasks } from '../hooks/use-tasks'
import { Skeleton } from '@/components/ui/skeleton'
import { TonalAvatar } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'
import type { ListTasksParams } from '../api/keys'

const DAY_MS = 86_400_000
const WINDOW_DAYS = 10

export function TaskTimelineView({ params }: { params: ListTasksParams }) {
  const { data, isLoading } = useTasks(params)
  const tasks = data?.data ?? []

  const { days, bars } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = today.getTime()
    const days = Array.from({ length: WINDOW_DAYS }, (_, i) => {
      const d = new Date(start + i * DAY_MS)
      return {
        ms: d.getTime(),
        label: d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      }
    })

    const bars = tasks
      .filter((t) => t.due_at || t.started_at)
      .map((t) => {
        const started = t.started_at ? new Date(t.started_at).setHours(0, 0, 0, 0) : start
        const due = t.due_at ? new Date(t.due_at).setHours(0, 0, 0, 0) : started
        const startCol = Math.max(0, Math.floor((started - start) / DAY_MS))
        const span = Math.max(1, Math.min(WINDOW_DAYS - startCol, Math.floor((due - started) / DAY_MS) + 1))
        if (startCol >= WINDOW_DAYS) return null
        return { task: t, start: startCol, span }
      })
      .filter(Boolean) as Array<{ task: (typeof tasks)[number]; start: number; span: number }>

    return { days, bars }
  }, [tasks])

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  if (bars.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-paper-line bg-paper-surface p-12 text-center text-[13px] text-ink-3">
        No hay tareas con fechas para mostrar en timeline.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-paper-line bg-paper-raised">
      {/* Header */}
      <div
        className="grid border-b border-paper-line"
        style={{ gridTemplateColumns: `220px repeat(${WINDOW_DAYS}, 1fr)` }}
      >
        <div className="border-r border-paper-line-soft px-3.5 py-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.3px] text-ink-3">
          Tarea
        </div>
        {days.map((d, i) => (
          <div
            key={i}
            className={cn(
              'py-2.5 text-center text-[11px] text-ink-3',
              i < WINDOW_DAYS - 1 && 'border-r border-paper-line-soft',
            )}
          >
            {d.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      {bars.map(({ task, start, span }, i) => (
        <div
          key={task.id}
          className={cn(
            'grid min-h-[44px] items-center',
            i < bars.length - 1 && 'border-b border-paper-line-soft',
          )}
          style={{ gridTemplateColumns: `220px repeat(${WINDOW_DAYS}, 1fr)` }}
        >
          <Link
            href={`/tareas/${task.id}`}
            className="flex items-center gap-2 border-r border-paper-line-soft px-3.5 py-2 text-[12.5px] hover:bg-paper-bg-2"
          >
            {task.assignee && (
              <TonalAvatar
                size={20}
                name={task.assignee.name ?? task.assignee.email}
              />
            )}
            <span className="truncate">{task.title}</span>
          </Link>
          <div
            className="relative flex items-center"
            style={{ gridColumn: `${start + 2} / span ${span}` }}
          >
            <Link
              href={`/tareas/${task.id}`}
              className="mx-1 flex w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium"
              style={{
                background: 'hsl(var(--accent-h) / 0.15)',
                color: 'hsl(var(--accent-ink))',
                border: '1px solid hsl(var(--accent-h) / 0.4)',
              }}
            >
              <span className="font-mono">T-{task.id.slice(0, 8).toUpperCase()}</span>
              <span className="truncate">
                · {(task.actual_minutes / 60).toFixed(1)}/
                {task.estimated_minutes ? (task.estimated_minutes / 60).toFixed(0) : '—'}h
              </span>
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
