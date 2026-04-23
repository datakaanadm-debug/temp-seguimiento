import { Badge } from '@/components/ui/badge'
import { STATE_LABELS, STATE_COLORS } from '../lib/state-machine'
import { cn } from '@/lib/utils'
import type { TaskState } from '@/types/api'

export function StateBadge({ state, className }: { state: TaskState; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
        STATE_COLORS[state],
        className,
      )}
    >
      {STATE_LABELS[state]}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: 'urgent' | 'high' | 'normal' | 'low' }) {
  const map = {
    urgent: { label: 'Urgente', variant: 'destructive' as const },
    high: { label: 'Alta', variant: 'warning' as const },
    normal: { label: 'Normal', variant: 'secondary' as const },
    low: { label: 'Baja', variant: 'outline' as const },
  }
  const { label, variant } = map[priority]
  return <Badge variant={variant}>{label}</Badge>
}
