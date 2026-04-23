'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Icon } from '@/components/ui/icon'
import { useTasks } from '../hooks/use-tasks'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ListTasksParams } from '../api/keys'

const DOW = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']

export function TaskCalendarView({ params }: { params: ListTasksParams }) {
  const { data, isLoading } = useTasks(params)
  const tasks = data?.data ?? []

  const [anchor, setAnchor] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })

  const { cells, label, today } = useMemo(() => {
    const first = new Date(anchor)
    const year = first.getFullYear()
    const month = first.getMonth()
    const firstWeekday = (first.getDay() + 6) % 7 // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells: Array<{ day: number; date: Date; inMonth: boolean; tasks: typeof tasks }> = []
    for (let i = 0; i < 42; i++) {
      const offset = i - firstWeekday
      const date = new Date(year, month, 1 + offset)
      const inMonth = date.getMonth() === month
      const day = date.getDate()
      cells.push({
        day,
        date,
        inMonth,
        tasks: tasks.filter((t) => {
          if (!t.due_at) return false
          const d = new Date(t.due_at)
          return (
            d.getFullYear() === date.getFullYear() &&
            d.getMonth() === date.getMonth() &&
            d.getDate() === date.getDate()
          )
        }),
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return {
      cells,
      label: first.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
      today,
    }
  }, [anchor, tasks])

  const shift = (months: number) => {
    const d = new Date(anchor)
    d.setMonth(d.getMonth() + months)
    setAnchor(d)
  }

  if (isLoading) {
    return <Skeleton className="h-[600px] w-full" />
  }

  return (
    <div className="overflow-hidden rounded-lg border border-paper-line bg-paper-raised">
      {/* Month nav */}
      <div className="flex items-center justify-between border-b border-paper-line px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shift(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-paper-bg-2 hover:text-ink"
            aria-label="Mes anterior"
          >
            <Icon.Chev size={14} className="rotate-180" />
          </button>
          <span className="text-[13px] font-semibold capitalize text-ink">{label}</span>
          <button
            type="button"
            onClick={() => shift(1)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-paper-bg-2 hover:text-ink"
            aria-label="Mes siguiente"
          >
            <Icon.Chev size={14} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            const d = new Date()
            d.setDate(1)
            setAnchor(d)
          }}
          className="text-[12px] text-ink-3 hover:text-ink"
        >
          Hoy
        </button>
      </div>

      {/* DOW header */}
      <div className="grid border-b border-paper-line" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {DOW.map((d) => (
          <div key={d} className="py-2.5 text-center text-[11px] font-semibold text-ink-3">
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '96px' }}
      >
        {cells.map((cell, i) => {
          const isToday = cell.date.getTime() === today.getTime()
          return (
            <div
              key={i}
              className={cn(
                'p-2',
                i % 7 !== 6 && 'border-r border-paper-line-soft',
                i < 35 && 'border-b border-paper-line-soft',
                isToday && 'bg-paper-bg-2',
              )}
            >
              <div
                className={cn(
                  'text-[12px]',
                  isToday && 'font-bold',
                  !cell.inMonth && 'text-ink-muted',
                  cell.inMonth && !isToday && 'text-ink',
                  isToday && 'text-primary',
                )}
              >
                {cell.day}
              </div>
              <div className="mt-1.5 flex flex-col gap-0.5">
                {cell.tasks.slice(0, 3).map((t) => (
                  <Link
                    key={t.id}
                    href={`/tareas/${t.id}`}
                    className="truncate rounded-[3px] border-l-2 px-1.5 py-0.5 text-[10px] hover:brightness-95"
                    style={{
                      background: 'hsl(var(--accent-h) / 0.15)',
                      borderLeftColor: 'hsl(var(--accent-h))',
                      color: 'hsl(var(--accent-ink))',
                    }}
                  >
                    {t.title}
                  </Link>
                ))}
                {cell.tasks.length > 3 && (
                  <span className="text-[10px] text-ink-3">+ {cell.tasks.length - 3} más</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
