'use client'

import Link from 'next/link'
import { Calendar, Clock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StateBadge, PriorityBadge } from './state-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, initialsFromName } from '@/lib/utils'
import { useTasks } from '../hooks/use-tasks'
import type { ListTasksParams } from '../api/keys'

export function TaskListView({ params }: { params: ListTasksParams }) {
  const { data, isLoading } = useTasks(params)
  const tasks = data?.data ?? []

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="border border-dashed rounded-lg p-12 text-center">
        <p className="text-sm text-muted-foreground">No hay tareas que coincidan con estos filtros.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card divide-y">
      {tasks.map((task) => (
        <Link
          key={task.id}
          href={`/tareas/${task.id}`}
          className="flex items-center gap-4 px-4 py-3 hover:bg-muted/40 transition-colors"
        >
          <StateBadge state={task.state} />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium truncate">{task.title}</h3>
            <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
              {task.due_at && (
                <span className={cn('flex items-center gap-1', task.is_overdue && 'text-destructive font-medium')}>
                  <Calendar className="h-3 w-3" />
                  {new Date(task.due_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </span>
              )}
              {task.actual_minutes > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {Math.round(task.actual_minutes / 60 * 10) / 10}h
                </span>
              )}
            </div>
          </div>
          <PriorityBadge priority={task.priority} />
          {task.assignee ? (
            <Avatar className="h-7 w-7">
              <AvatarImage src={task.assignee.avatar_url ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {initialsFromName(task.assignee.name ?? task.assignee.email)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-7 w-7 rounded-full border-2 border-dashed" title="Sin asignar" />
          )}
        </Link>
      ))}
    </div>
  )
}
