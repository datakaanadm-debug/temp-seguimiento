'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { PaperCard, PriorityDot } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'
import { useTasks } from '../hooks/use-tasks'
import { createTask, changeTaskState, deleteTask } from '../api/tasks'
import { taskKeys } from '../api/keys'
import { STATE_LABELS } from '../lib/state-machine'
import type { Task } from '@/types/api'

export function TaskSubtasks({ taskId, projectId }: { taskId: string; projectId: string }) {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const { data, isLoading } = useTasks({
    parent_task_id: taskId,
    per_page: 100,
  })
  const subtasks = data?.data ?? []
  const done = subtasks.filter((s) => s.state === 'DONE' || s.state === 'CANCELLED').length

  const create = useMutation({
    mutationFn: (title: string) =>
      createTask({
        project_id: projectId,
        parent_task_id: taskId,
        title,
        priority: 'normal',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all })
      setNewTitle('')
      setCreating(false)
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo crear la subtarea'),
  })

  const toggle = useMutation({
    mutationFn: (s: Task) =>
      changeTaskState(s.id, s.state === 'DONE' ? 'TO_DO' : 'DONE'),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
    onError: (e: any) => toast.error(e?.message ?? 'Error'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
    onError: (e: any) => toast.error(e?.message ?? 'Error'),
  })

  return (
    <PaperCard
      title={
        <span className="flex items-center gap-2">
          Subtareas
          <span className="font-mono text-[10.5px] text-ink-3">
            {done}/{subtasks.length}
          </span>
        </span>
      }
      right={
        !creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1 text-[11.5px] text-ink-3 hover:text-ink"
          >
            <Icon.Plus size={11} />
            Añadir
          </button>
        )
      }
    >
      {isLoading ? (
        <div className="py-2 text-[12px] text-ink-3">Cargando…</div>
      ) : subtasks.length === 0 && !creating ? (
        <div className="py-3 text-[12.5px] text-ink-3">
          Sin subtareas. Divide el trabajo en pasos pequeños.
        </div>
      ) : (
        <div className="-my-1.5">
          {subtasks.map((s, i) => {
            const isDone = s.state === 'DONE' || s.state === 'CANCELLED'
            return (
              <div
                key={s.id}
                className={cn(
                  'flex items-center gap-2 py-1.5',
                  i > 0 && 'border-t border-paper-line-soft',
                )}
              >
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => toggle.mutate(s)}
                  className="h-4 w-4 accent-primary"
                />
                <PriorityDot p={s.priority as any} />
                <Link
                  href={`/tareas/${s.id}`}
                  className={cn(
                    'flex-1 truncate text-[13px]',
                    isDone ? 'text-ink-3 line-through' : 'text-ink hover:text-primary',
                  )}
                >
                  {s.title}
                </Link>
                {s.assignee && (
                  <span className="text-[10.5px] text-ink-3">
                    {s.assignee.name?.split(' ')[0] ?? s.assignee.email}
                  </span>
                )}
                <span className="font-mono text-[10px] text-ink-muted">{STATE_LABELS[s.state]}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('¿Eliminar esta subtarea?')) remove.mutate(s.id)
                  }}
                  className="rounded px-1 text-[13px] text-ink-3 hover:text-destructive"
                  aria-label="Eliminar"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

      {creating && (
        <div className="mt-2 flex items-center gap-2 border-t border-paper-line-soft pt-2">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTitle.trim()) create.mutate(newTitle.trim())
              if (e.key === 'Escape') setCreating(false)
            }}
            placeholder="Título de la subtarea…"
            className="flex-1 rounded-md border border-paper-line bg-paper-surface px-2.5 py-1 text-[12.5px] text-ink outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => newTitle.trim() && create.mutate(newTitle.trim())}
            disabled={!newTitle.trim() || create.isPending}
            className="rounded-md bg-ink px-2.5 py-1 text-[11.5px] font-medium text-paper-surface hover:bg-ink-2 disabled:opacity-50"
          >
            Añadir
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(false)
              setNewTitle('')
            }}
            className="text-[12px] text-ink-3 hover:text-ink"
          >
            Cancelar
          </button>
        </div>
      )}
    </PaperCard>
  )
}
