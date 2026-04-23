'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, MessageSquare, Paperclip, Timer } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn, initialsFromName } from '@/lib/utils'
import { PRIORITY_COLORS } from '../lib/state-machine'
import type { Task } from '@/types/api'

interface TaskCardProps {
  task: Task
  onClick?: () => void
  draggable?: boolean
}

export function TaskCard({ task, onClick, draggable = true }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !draggable,
    data: { task },
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const overdue = task.is_overdue

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      onClick={onClick}
      className={cn(
        'rounded-md border bg-card p-3 shadow-sm cursor-pointer hover:border-primary/40 transition-colors',
        isDragging && 'opacity-40 rotate-2',
        overdue && 'border-destructive/40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-tight line-clamp-2">{task.title}</h3>
        {task.priority !== 'normal' && (
          <span
            className={cn(
              'shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border uppercase',
              PRIORITY_COLORS[task.priority],
            )}
          >
            {task.priority === 'urgent' ? '●' : task.priority === 'high' ? '▲' : '▼'}
          </span>
        )}
      </div>

      {task.tags && task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full border"
              style={{ borderColor: t.color, color: t.color }}
            >
              {t.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 text-muted-foreground text-xs">
        <div className="flex items-center gap-2">
          {task.due_at && (
            <span className={cn('flex items-center gap-1', overdue && 'text-destructive font-medium')}>
              <Calendar className="h-3 w-3" />
              {formatDueShort(task.due_at)}
            </span>
          )}
          {(task.comment_count ?? 0) > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare className="h-3 w-3" />
              {task.comment_count}
            </span>
          )}
          {(task.attachment_count ?? 0) > 0 && (
            <span className="flex items-center gap-0.5">
              <Paperclip className="h-3 w-3" />
              {task.attachment_count}
            </span>
          )}
          {task.actual_minutes > 0 && (
            <span className="flex items-center gap-0.5">
              <Timer className="h-3 w-3" />
              {Math.round(task.actual_minutes / 60 * 10) / 10}h
            </span>
          )}
        </div>

        {task.assignee && (
          <Avatar className="h-6 w-6">
            <AvatarImage src={task.assignee.avatar_url ?? undefined} alt={task.assignee.name ?? ''} />
            <AvatarFallback className="text-[10px]">
              {initialsFromName(task.assignee.name ?? task.assignee.email)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  )
}

function formatDueShort(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const diffMs = d.getTime() - today.setHours(0, 0, 0, 0)
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Mañana'
  if (diffDays === -1) return 'Ayer'
  if (diffDays > 0 && diffDays < 7) return `en ${diffDays}d`
  if (diffDays < 0 && diffDays > -7) return `${Math.abs(diffDays)}d tarde`
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}
