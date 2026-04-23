'use client'

import { useState } from 'react'
import { ArrowLeft, Calendar, Pause, Play } from 'lucide-react'
import Link from 'next/link'
import { useTask } from '../hooks/use-tasks'
import { useChangeTaskState } from '../hooks/use-task-mutations'
import { useRunningTimer, useStartTimer, useStopTimer } from '../hooks/use-timer'
import { Button } from '@/components/ui/button'
import { StateBadge, PriorityBadge } from './state-badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ALLOWED_TRANSITIONS, STATE_LABELS } from '../lib/state-machine'
import { initialsFromName } from '@/lib/utils'
import type { TaskState } from '@/types/api'

export function TaskDetail({ taskId }: { taskId: string }) {
  const { data: task, isLoading } = useTask(taskId)
  const changeState = useChangeTaskState(taskId)
  const startTimer = useStartTimer()
  const stopTimer = useStopTimer()
  const { data: runningTimer } = useRunningTimer()
  const [reason, setReason] = useState('')

  if (isLoading) {
    return (
      <div className="container py-6 space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (!task) {
    return <div className="container py-12 text-center text-muted-foreground">Tarea no encontrada.</div>
  }

  const allowed = ALLOWED_TRANSITIONS[task.state]
  const thisTimerRunning = runningTimer?.task_id === task.id
  const otherTimerRunning = !!runningTimer && runningTimer.task_id !== task.id

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
    <div className="container py-6 max-w-4xl">
      <Link
        href="/tareas"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Tareas
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <StateBadge state={task.state} />
            <PriorityBadge priority={task.priority} />
            {task.due_at && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {new Date(task.due_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {thisTimerRunning ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => stopTimer.mutate({ entryId: runningTimer!.id })}
            >
              <Pause className="h-4 w-4 mr-1" />
              Detener timer
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={otherTimerRunning}
              onClick={() => startTimer.mutate({ taskId: task.id })}
              title={otherTimerRunning ? 'Ya tienes un timer corriendo' : undefined}
            >
              <Play className="h-4 w-4 mr-1" />
              Iniciar timer
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm">Cambiar estado</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {allowed.map((s) => (
                <DropdownMenuItem key={s} onClick={() => onChangeState(s)}>
                  → {STATE_LABELS[s]}
                </DropdownMenuItem>
              ))}
              {allowed.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">Sin transiciones.</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {task.blocked_reason && (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <strong>Bloqueo:</strong> {task.blocked_reason}
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          <section>
            <h2 className="text-sm font-semibold mb-2">Descripción</h2>
            {task.description ? (
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{task.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sin descripción.</p>
            )}
          </section>
        </div>

        <aside className="space-y-4 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Asignado a</div>
            {task.assignee ? (
              <div className="mt-1 flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={task.assignee.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {initialsFromName(task.assignee.name ?? task.assignee.email)}
                  </AvatarFallback>
                </Avatar>
                <span>{task.assignee.name ?? task.assignee.email}</span>
              </div>
            ) : (
              <div className="mt-1 text-muted-foreground italic">Sin asignar</div>
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Tiempo</div>
            <div className="mt-1">
              {Math.round(task.actual_minutes / 60 * 10) / 10}h
              {task.estimated_minutes != null && (
                <span className="text-muted-foreground"> / {Math.round(task.estimated_minutes / 60 * 10) / 10}h est.</span>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Creada</div>
            <div className="mt-1">{new Date(task.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</div>
          </div>

          {task.completed_at && (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Completada</div>
              <div className="mt-1">{new Date(task.completed_at).toLocaleDateString('es-MX')}</div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
