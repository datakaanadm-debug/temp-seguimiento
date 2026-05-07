'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '@/components/ui/icon'
import { PaperBadge, PriorityDot, TonalAvatar } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'
import type { Task } from '@/types/api'

const TAG_TONES = ['tag1', 'tag2', 'tag3', 'tag4'] as const

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

  const actualH = task.actual_minutes / 60
  const estH = task.estimated_minutes ? task.estimated_minutes / 60 : 0
  const progress = estH > 0 ? Math.min(100, (actualH / estH) * 100) : 0
  const overEstimate = estH > 0 && actualH > estH
  const tinyId = task.id.slice(0, 8).toUpperCase()

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      onClick={(e) => {
        // Si dnd-kit está moviendo, no dispares click
        if (isDragging) return
        onClick?.()
      }}
      className={cn(
        'rounded-md border border-paper-line bg-paper-raised p-2.5 shadow-paper-1 transition-colors',
        draggable && 'cursor-grab active:cursor-grabbing',
        onClick && !draggable && 'cursor-pointer',
        'hover:border-paper-line-soft',
        isDragging && 'opacity-40',
        task.is_overdue && 'border-destructive/40',
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <PriorityDot p={(task.priority as any) ?? 'normal'} />
        <span className="font-mono text-[10.5px] text-ink-3">T-{tinyId}</span>
        {task.state === 'BLOCKED' && (
          <PaperBadge tone="danger" className="ml-auto !text-[9px] !px-1.5">
            BLOQUEADA
          </PaperBadge>
        )}
      </div>

      <div className="mb-2.5 text-[13px] leading-[1.4] text-ink line-clamp-2">{task.title}</div>

      {task.tags && task.tags.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((tag, i) => (
            <PaperBadge key={tag.id} tone={TAG_TONES[i % TAG_TONES.length]} className="!text-[10px]">
              {tag.name}
            </PaperBadge>
          ))}
        </div>
      )}

      {estH > 0 && (
        <div className="mb-2 h-[3px] overflow-hidden rounded-full bg-paper-line-soft">
          <div
            className={cn('h-full', overEstimate ? 'bg-destructive' : 'bg-primary')}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex items-center gap-2 text-[11px] text-ink-3">
        {task.assignee ? (
          <TonalAvatar
            size={20}
            name={task.assignee.name ?? task.assignee.email}
          />
        ) : (
          <div className="h-5 w-5 rounded-full border border-dashed border-paper-line" />
        )}
        <span className="ml-auto inline-flex items-center gap-1">
          <Icon.Cal size={11} />
          {task.due_at ? formatDueShort(task.due_at) : '—'}
        </span>
        {estH > 0 && (
          <span className="font-mono">
            {actualH.toFixed(1)}/{estH.toFixed(0)}h
          </span>
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
