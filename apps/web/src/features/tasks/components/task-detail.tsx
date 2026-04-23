'use client'

import Link from 'next/link'
import { Icon } from '@/components/ui/icon'
import {
  SectionTitle, PaperCard, PaperBadge, TonalAvatar, PriorityDot,
} from '@/components/ui/primitives'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTask } from '../hooks/use-tasks'
import { useChangeTaskState } from '../hooks/use-task-mutations'
import { useRunningTimer, useStartTimer, useStopTimer } from '../hooks/use-timer'
import {
  ALLOWED_TRANSITIONS, STATE_LABELS, PRIORITY_LABELS,
} from '../lib/state-machine'
import type { TaskState } from '@/types/api'

const STATE_TONE: Record<TaskState, 'neutral' | 'info' | 'accent' | 'warn' | 'ok' | 'danger'> = {
  BACKLOG: 'neutral',
  TO_DO: 'info',
  IN_PROGRESS: 'accent',
  IN_REVIEW: 'warn',
  DONE: 'ok',
  BLOCKED: 'danger',
  CANCELLED: 'neutral',
}

export function TaskDetail({ taskId }: { taskId: string }) {
  const { data: task, isLoading } = useTask(taskId)
  const changeState = useChangeTaskState(taskId)
  const startTimer = useStartTimer()
  const stopTimer = useStopTimer()
  const { data: runningTimer } = useRunningTimer()

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1100px] px-7 py-5 space-y-4">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="mx-auto max-w-[1100px] px-7 py-16 text-center text-[13px] text-ink-3">
        Tarea no encontrada.
      </div>
    )
  }

  const allowed = ALLOWED_TRANSITIONS[task.state]
  const thisTimerRunning = runningTimer?.task_id === task.id
  const otherTimerRunning = !!runningTimer && runningTimer.task_id !== task.id
  const actualH = task.actual_minutes / 60
  const estH = task.estimated_minutes ? task.estimated_minutes / 60 : 0

  const onChangeState = (state: TaskState) => {
    if (state === 'BLOCKED') {
      const r = prompt('¿Cuál es el bloqueo?', '')
      if (!r || r.trim() === '') return
      changeState.mutate({ state, reason: r })
    } else {
      changeState.mutate({ state })
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] px-7 py-5 pb-10">
      <Link
        href="/tareas"
        className="mb-3 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink"
      >
        <Icon.Chev size={11} className="rotate-180" /> Tareas
      </Link>

      <SectionTitle
        kicker={`T-${task.id.slice(0, 8).toUpperCase()}`}
        title={task.title}
        sub={
          <span className="flex items-center gap-2">
            <PaperBadge tone={STATE_TONE[task.state]}>{STATE_LABELS[task.state]}</PaperBadge>
            <span className="inline-flex items-center gap-1 text-[12px]">
              <PriorityDot p={task.priority as any} />
              {PRIORITY_LABELS[task.priority]}
            </span>
            {task.due_at && (
              <span className="inline-flex items-center gap-1 text-[12px] text-ink-3">
                <Icon.Cal size={11} />
                {new Date(task.due_at).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            )}
          </span>
        }
        right={
          <>
            {thisTimerRunning ? (
              <button
                type="button"
                onClick={() => stopTimer.mutate({ entryId: runningTimer!.id })}
                className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-2.5 py-[7px] text-[12px] font-medium text-destructive-foreground hover:opacity-90"
              >
                <Icon.Clock size={13} />
                Detener timer
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startTimer.mutate({ taskId: task.id })}
                disabled={otherTimerRunning}
                title={otherTimerRunning ? 'Ya tienes un timer corriendo' : undefined}
                className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft disabled:opacity-40"
              >
                <Icon.Clock size={13} />
                Iniciar timer
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
                >
                  Cambiar estado
                  <Icon.ChevDown size={11} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {allowed.map((s) => (
                  <DropdownMenuItem key={s} onClick={() => onChangeState(s)}>
                    → {STATE_LABELS[s]}
                  </DropdownMenuItem>
                ))}
                {allowed.length === 0 && (
                  <div className="px-2 py-1.5 text-[11px] text-ink-3">Sin transiciones.</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {task.blocked_reason && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive-soft p-3 text-[13px] text-destructive">
          <Icon.Flag size={14} className="mt-0.5 shrink-0" />
          <div>
            <b>Bloqueo reportado.</b> {task.blocked_reason}
          </div>
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 280px' }}>
        <div className="space-y-4">
          <PaperCard title="Descripción">
            {task.description ? (
              <p className="whitespace-pre-wrap font-serif text-[15px] leading-[1.65] text-ink">
                {task.description}
              </p>
            ) : (
              <p className="italic text-[13px] text-ink-3">Sin descripción.</p>
            )}
          </PaperCard>
        </div>

        <aside className="flex flex-col gap-3">
          <PaperCard title="Asignado a">
            {task.assignee ? (
              <div className="flex items-center gap-2.5">
                <TonalAvatar size={28} name={task.assignee.name ?? task.assignee.email} />
                <span className="truncate text-[13px] font-medium text-ink">
                  {task.assignee.name ?? task.assignee.email}
                </span>
              </div>
            ) : (
              <div className="italic text-[12px] text-ink-3">Sin asignar</div>
            )}
          </PaperCard>

          <PaperCard>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.5px] text-ink-3">
              Tiempo
            </div>
            <div className="mt-1 font-serif text-[26px] leading-none text-ink">
              {actualH.toFixed(1)}h
              {estH > 0 && (
                <span className="ml-1 font-mono text-[13px] text-ink-3">/{estH.toFixed(0)}h</span>
              )}
            </div>
            {estH > 0 && (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-paper-line-soft">
                <div
                  className={`h-full rounded-full ${
                    actualH > estH ? 'bg-destructive' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(100, (actualH / estH) * 100)}%` }}
                />
              </div>
            )}
          </PaperCard>

          <PaperCard>
            <div className="space-y-2 text-[12px]">
              <Row
                label="Creada"
                value={new Date(task.created_at).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                })}
              />
              {task.started_at && (
                <Row
                  label="Iniciada"
                  value={new Date(task.started_at).toLocaleDateString('es-MX')}
                />
              )}
              {task.completed_at && (
                <Row
                  label="Completada"
                  value={new Date(task.completed_at).toLocaleDateString('es-MX')}
                />
              )}
            </div>
          </PaperCard>
        </aside>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-ink-3">{label}</span>
      <span className="font-mono text-ink">{value}</span>
    </div>
  )
}
