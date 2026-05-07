'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors, DragOverlay,
  useDroppable,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Icon } from '@/components/ui/icon'
import { useTasks } from '../hooks/use-tasks'
import { useTaskRealtime } from '../hooks/use-task-realtime'
import { TaskCard } from './task-card'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { Task, TaskList, TaskState } from '@/types/api'
import { STATE_LABELS } from '../lib/state-machine'
import { taskKeys } from '../api/keys'
import { changeTaskState, updateTask } from '../api/tasks'
import { toast } from 'sonner'

interface KanbanBoardProps {
  projectId?: string
  lists?: TaskList[]
  filters?: {
    state?: TaskState | null
    priority?: string | null
    assignee_id?: string | null
    q?: string | null
    mine?: boolean
  }
}

const STATE_DOT: Record<string, string> = {
  BACKLOG: 'hsl(var(--ink-muted))',
  TO_DO: 'hsl(var(--info))',
  IN_PROGRESS: 'hsl(var(--accent-h))',
  IN_REVIEW: 'hsl(var(--warn))',
  DONE: 'hsl(var(--ok))',
}

const VISIBLE_STATES: TaskState[] = ['BACKLOG', 'TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']

export function KanbanBoard({ projectId, lists, filters }: KanbanBoardProps) {
  const router = useRouter()
  const qc = useQueryClient()
  const { data, isLoading } = useTasks({
    project_id: projectId,
    state: filters?.state ?? undefined,
    priority: (filters?.priority as any) ?? undefined,
    assignee_id: filters?.assignee_id ?? undefined,
    q: filters?.q ?? undefined,
    mine: filters?.mine || undefined,
    per_page: 200,
  })
  useTaskRealtime(projectId ?? '')

  const tasks = data?.data ?? []

  const columns = useMemo(() => buildColumns(tasks, lists), [tasks, lists])
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const handleDragStart = (e: DragStartEvent) => {
    const t = tasks.find((x) => x.id === e.active.id)
    setActiveTask(t ?? null)
  }
  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = e
    if (!over) return

    const task = tasks.find((t) => t.id === active.id)
    if (!task) return

    // `over` puede ser la columna (useDroppable) o una card (useSortable).
    // Si es una card, resolver su columna a partir de los grupos.
    let destColumn: string | undefined = (over.data?.current as any)?.columnKey
    if (!destColumn) {
      const overTask = tasks.find((t) => t.id === over.id)
      if (overTask) {
        destColumn = lists && lists.length > 0
          ? (overTask.list_id ?? undefined)
          : (overTask.state === 'BLOCKED' ? 'IN_PROGRESS' : overTask.state)
      }
    }
    if (!destColumn) return

    // Columnas sin lists = por estado
    if (!lists || lists.length === 0) {
      const targetState = destColumn as TaskState
      if (targetState && targetState !== task.state) {
        // Optimistic update en todas las listas
        qc.setQueriesData<any>({ queryKey: ['tasks', 'list'] }, (old: any) => {
          if (!old?.data) return old
          return {
            ...old,
            data: old.data.map((t: Task) =>
              t.id === task.id ? { ...t, state: targetState } : t,
            ),
          }
        })
        try {
          await changeTaskState(task.id, targetState)
        } catch (err: any) {
          toast.error(err?.message ?? 'No se pudo mover la tarea')
        } finally {
          qc.invalidateQueries({ queryKey: taskKeys.all })
        }
      }
    } else if (destColumn !== task.list_id) {
      qc.setQueriesData<any>({ queryKey: ['tasks', 'list'] }, (old: any) => {
        if (!old?.data) return old
        return {
          ...old,
          data: old.data.map((t: Task) =>
            t.id === task.id ? { ...t, list_id: destColumn } : t,
          ),
        }
      })
      try {
        await updateTask(task.id, { list_id: destColumn })
      } catch (err: any) {
        toast.error(err?.message ?? 'No se pudo mover la tarea')
      } finally {
        qc.invalidateQueries({ queryKey: taskKeys.all })
      }
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-5 gap-3">
        {VISIBLE_STATES.map((s) => (
          <div key={s} className="space-y-2">
            <Skeleton className="h-9" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-3 overflow-x-auto pb-3" style={{ gridTemplateColumns: 'repeat(5, minmax(240px, 1fr))' }}>
        {columns.map((col) => (
          <KanbanColumn
            key={col.key}
            column={col}
            onOpenTask={(id) => router.push(`/tareas/${id}`)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="rotate-[2deg]">
            <TaskCard task={activeTask} draggable={false} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

interface Column {
  key: string
  title: string
  dot: string
  items: Task[]
  wipLimit?: number | null
}

function buildColumns(tasks: Task[], lists?: TaskList[]): Column[] {
  if (lists && lists.length > 0) {
    const byList = new Map<string, Task[]>()
    for (const l of lists) byList.set(l.id, [])
    for (const t of tasks) {
      if (t.list_id && byList.has(t.list_id)) byList.get(t.list_id)!.push(t)
    }
    return lists
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((l) => ({
        key: l.id,
        title: l.name,
        dot: l.color ?? 'hsl(var(--ink-muted))',
        items: byList.get(l.id)!.sort((a, b) => a.position - b.position),
        wipLimit: l.wip_limit,
      }))
  }

  const groups: Record<TaskState, Task[]> = {
    BACKLOG: [], TO_DO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [], BLOCKED: [], CANCELLED: [],
  }
  for (const t of tasks) {
    if (t.state === 'CANCELLED') continue
    if (t.state === 'BLOCKED') groups.IN_PROGRESS.push(t)
    else groups[t.state].push(t)
  }
  return VISIBLE_STATES.map((k) => ({
    key: k,
    title: STATE_LABELS[k],
    dot: STATE_DOT[k] ?? 'hsl(var(--ink-muted))',
    items: groups[k],
  }))
}

function KanbanColumn({
  column,
  onOpenTask,
}: {
  column: Column
  onOpenTask: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${column.key}`,
    data: { columnKey: column.key },
  })
  const overLimit = column.wipLimit != null && column.items.length >= column.wipLimit

  return (
    <div
      ref={setNodeRef}
      data-column={column.key}
      className={cn(
        'flex min-h-[420px] flex-col rounded-lg border bg-paper-surface transition-colors',
        isOver ? 'border-primary-ink bg-primary-soft/30' : 'border-paper-line-soft',
      )}
    >
      <header className="flex items-center gap-2 border-b border-paper-line-soft px-3 py-2.5">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: column.dot }}
          aria-hidden
        />
        <span className="text-[12.5px] font-semibold text-ink">{column.title}</span>
        <span className={cn(
          'ml-auto font-mono text-[11px]',
          overLimit ? 'text-destructive' : 'text-ink-3',
        )}>
          {column.items.length}
          {column.wipLimit ? <span className="opacity-60">/{column.wipLimit}</span> : null}
        </span>
        <button
          type="button"
          className="text-ink-3 hover:text-ink"
          aria-label={`Añadir tarea a ${column.title}`}
        >
          <Icon.Plus size={13} />
        </button>
      </header>

      <SortableContext items={column.items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 p-2">
          {column.items.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onOpenTask(task.id)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

