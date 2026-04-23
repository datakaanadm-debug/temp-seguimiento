'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors, DragOverlay,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Icon } from '@/components/ui/icon'
import { useTasks } from '../hooks/use-tasks'
import { useTaskRealtime } from '../hooks/use-task-realtime'
import { TaskCard } from './task-card'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { Task, TaskList, TaskState } from '@/types/api'
import { STATE_LABELS } from '../lib/state-machine'

interface KanbanBoardProps {
  projectId?: string
  lists?: TaskList[]
}

const STATE_DOT: Record<string, string> = {
  BACKLOG: 'hsl(var(--ink-muted))',
  TO_DO: 'hsl(var(--info))',
  IN_PROGRESS: 'hsl(var(--accent-h))',
  IN_REVIEW: 'hsl(var(--warn))',
  DONE: 'hsl(var(--ok))',
}

const VISIBLE_STATES: TaskState[] = ['BACKLOG', 'TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']

export function KanbanBoard({ projectId, lists }: KanbanBoardProps) {
  const { data, isLoading } = useTasks({
    project_id: projectId,
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
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = e
    if (!over) return

    const task = tasks.find((t) => t.id === active.id)
    const destColumn = (over.data?.current as any)?.columnKey as string | undefined
    if (!task || !destColumn) return

    if (!lists || lists.length === 0) {
      const targetState = destColumn as TaskState
      if (targetState && targetState !== task.state) {
        changeStateFor(task.id, targetState)
      }
    } else if (destColumn !== task.list_id) {
      updateListFor(task.id, destColumn)
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
          <KanbanColumn key={col.key} column={col} />
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

function KanbanColumn({ column }: { column: Column }) {
  const { setNodeRef } = useSortable({
    id: `col-${column.key}`,
    data: { columnKey: column.key },
  })
  const overLimit = column.wipLimit != null && column.items.length >= column.wipLimit

  return (
    <div
      ref={setNodeRef}
      data-column={column.key}
      className="flex min-h-[420px] flex-col rounded-lg border border-paper-line-soft bg-paper-surface"
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
            <Link key={task.id} href={`/tareas/${task.id}`} className="block" onClick={(e) => { /* dnd-kit handles drag */ if ((e.target as HTMLElement).closest('[data-dragging]')) e.preventDefault() }}>
              <TaskCard task={task} />
            </Link>
          ))}
          <button
            type="button"
            className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-paper-line bg-transparent px-2 py-2 text-[12px] text-ink-3 transition hover:border-paper-line-soft hover:text-ink"
          >
            <Icon.Plus size={12} /> Añadir tarea
          </button>
        </div>
      </SortableContext>
    </div>
  )
}

function changeStateFor(taskId: string, state: TaskState) {
  import('../api/tasks').then(({ changeTaskState }) => changeTaskState(taskId, state))
}

function updateListFor(taskId: string, listId: string) {
  import('../api/tasks').then(({ updateTask }) => updateTask(taskId, { list_id: listId }))
}
