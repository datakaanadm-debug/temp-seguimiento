'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus } from 'lucide-react'
import { useTasks } from '../hooks/use-tasks'
import { useChangeTaskState, useUpdateTask } from '../hooks/use-task-mutations'
import { useTaskRealtime } from '../hooks/use-task-realtime'
import { TaskCard } from './task-card'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Task, TaskList, TaskState } from '@/types/api'
import { STATE_LABELS, TASK_STATES } from '../lib/state-machine'

interface KanbanBoardProps {
  projectId: string
  lists?: TaskList[]
  /** Si no hay lists custom, usa columns por `state` (Backlog/TO_DO/...). */
}

export function KanbanBoard({ projectId, lists }: KanbanBoardProps) {
  const { data, isLoading } = useTasks({ project_id: projectId, per_page: 200 })
  useTaskRealtime(projectId)

  const changeState = useChangeTaskState('') // mutation factory por task id, creamos uno por call abajo
  const tasks = data?.data ?? []

  const columns = useMemo(() => buildColumns(tasks, lists), [tasks, lists])
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return

    const task = tasks.find((t) => t.id === active.id)
    const destColumn = (over.data?.current as any)?.columnKey as string | undefined
    if (!task || !destColumn) return

    // Si columnas son por state, cambia state. Si son por list_id, cambia list_id.
    if (!lists || lists.length === 0) {
      const targetState = destColumn as TaskState
      if (targetState && targetState !== task.state) {
        changeStateFor(task.id, targetState)
      }
    } else {
      if (destColumn !== task.list_id) {
        updateListFor(task.id, destColumn)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {TASK_STATES.slice(0, 4).map((s) => (
          <div key={s} className="w-72 shrink-0 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <KanbanColumn key={col.key} column={col} activeId={activeId} />
        ))}
      </div>
    </DndContext>
  )
}

interface Column {
  key: string         // state value o list_id
  title: string
  items: Task[]
  wipLimit?: number | null
}

function buildColumns(tasks: Task[], lists?: TaskList[]): Column[] {
  if (lists && lists.length > 0) {
    const byList = new Map<string, Task[]>()
    for (const l of lists) byList.set(l.id, [])
    for (const t of tasks) {
      if (t.list_id && byList.has(t.list_id)) {
        byList.get(t.list_id)!.push(t)
      }
    }
    return lists
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((l) => ({
        key: l.id,
        title: l.name,
        items: byList.get(l.id)!.sort((a, b) => a.position - b.position),
        wipLimit: l.wip_limit,
      }))
  }

  // Sin lists custom: 4 columnas base por state
  const groups: Record<string, Task[]> = {
    BACKLOG: [], TO_DO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [],
  }
  for (const t of tasks) {
    if (t.state === 'BLOCKED') groups.IN_PROGRESS!.push(t)
    else if (t.state === 'CANCELLED') continue
    else groups[t.state]!.push(t)
  }
  return (['BACKLOG', 'TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const).map((k) => ({
    key: k,
    title: STATE_LABELS[k as TaskState],
    items: groups[k]!,
  }))
}

function KanbanColumn({ column, activeId }: { column: Column; activeId: string | null }) {
  const { setNodeRef } = useSortable({
    id: `col-${column.key}`,
    data: { columnKey: column.key },
  })
  const overLimit = column.wipLimit != null && column.items.length >= column.wipLimit

  return (
    <div
      ref={setNodeRef}
      data-column={column.key}
      className="w-72 shrink-0 flex flex-col bg-muted/30 rounded-lg border"
    >
      <header className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2 text-sm font-medium">
          {column.title}
          <span className={cn(
            'inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-xs',
            overLimit ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
          )}>
            {column.items.length}
            {column.wipLimit ? <span className="opacity-60">/{column.wipLimit}</span> : null}
          </span>
        </div>
      </header>

      <SortableContext items={column.items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-2 space-y-2 min-h-[40px]">
          {column.items.map((task) => (
            <Link key={task.id} href={`/tareas/${task.id}`} className="block">
              <TaskCard task={task} />
            </Link>
          ))}
          {column.items.length === 0 && !activeId && (
            <p className="text-xs text-muted-foreground text-center py-6">Vacío</p>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// Mutation helpers inline (instancia por task)
let lastChangeStateClient: any = null
let lastUpdateClient: any = null

function changeStateFor(taskId: string, state: TaskState) {
  // En un caso real, usar un hook dedicado por task; simplificación: llamada directa.
  import('../api/tasks').then(({ changeTaskState }) => changeTaskState(taskId, state))
}

function updateListFor(taskId: string, listId: string) {
  import('../api/tasks').then(({ updateTask }) => updateTask(taskId, { list_id: listId }))
}
