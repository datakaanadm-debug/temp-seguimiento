import type { TaskPriority, TaskState } from '@/types/api'

export const TASK_STATES: TaskState[] = [
  'BACKLOG', 'TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED', 'CANCELLED',
]

export const STATE_LABELS: Record<TaskState, string> = {
  BACKLOG: 'Backlog',
  TO_DO: 'Por hacer',
  IN_PROGRESS: 'En curso',
  IN_REVIEW: 'Revisión',
  DONE: 'Hecho',
  BLOCKED: 'Bloqueado',
  CANCELLED: 'Cancelado',
}

/** Transiciones válidas — debe coincidir con backend TaskState::allowedTransitions. */
export const ALLOWED_TRANSITIONS: Record<TaskState, TaskState[]> = {
  BACKLOG:     ['TO_DO', 'CANCELLED', 'BLOCKED'],
  TO_DO:       ['IN_PROGRESS', 'BACKLOG', 'CANCELLED', 'BLOCKED'],
  IN_PROGRESS: ['IN_REVIEW', 'TO_DO', 'BLOCKED', 'CANCELLED', 'DONE'],
  IN_REVIEW:   ['DONE', 'IN_PROGRESS', 'BLOCKED', 'CANCELLED'],
  DONE:        ['IN_PROGRESS'],
  BLOCKED:     ['BACKLOG', 'TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'CANCELLED'],
  CANCELLED:   ['BACKLOG'],
}

export function canTransition(from: TaskState, to: TaskState): boolean {
  if (from === to) return false
  return ALLOWED_TRANSITIONS[from].includes(to)
}

/** Categoría base para UI (tablero Kanban clásico 4 cols o analytics). */
export function stateCategory(s: TaskState): 'todo' | 'in_progress' | 'done' | 'cancelled' {
  if (s === 'DONE') return 'done'
  if (s === 'CANCELLED') return 'cancelled'
  if (s === 'BACKLOG' || s === 'TO_DO') return 'todo'
  return 'in_progress'
}

// ── Priority ──
export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  normal: 'Normal',
  low: 'Baja',
}

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: 'bg-destructive/10 text-destructive border-destructive/30',
  high: 'bg-warning/10 text-warning-foreground border-warning/30',
  normal: 'bg-muted text-muted-foreground',
  low: 'bg-secondary text-muted-foreground',
}

export const STATE_COLORS: Record<TaskState, string> = {
  BACKLOG: 'bg-muted text-muted-foreground',
  TO_DO: 'bg-secondary text-secondary-foreground',
  IN_PROGRESS: 'bg-primary/10 text-primary border-primary/30',
  IN_REVIEW: 'bg-warning/10 text-warning-foreground border-warning/30',
  DONE: 'bg-success/10 text-success border-success/30',
  BLOCKED: 'bg-destructive/10 text-destructive border-destructive/30',
  CANCELLED: 'bg-muted text-muted-foreground line-through',
}
