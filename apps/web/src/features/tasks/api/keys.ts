import type { TaskPriority, TaskState } from '@/types/api'

export interface ListTasksParams {
  project_id?: string | null
  list_id?: string | null
  state?: TaskState
  assignee_id?: string | null
  priority?: TaskPriority
  mine?: boolean
  overdue?: boolean
  q?: string
  sort?: 'position' | 'created_at' | 'due_at' | 'priority' | 'updated_at'
  dir?: 'asc' | 'desc'
  per_page?: number
}

/** Query keys centralizados por feature para evitar typos y facilitar invalidación. */
export const taskKeys = {
  all: ['tasks'] as const,
  list: (params: ListTasksParams) => ['tasks', 'list', params] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
  comments: (id: string) => ['tasks', id, 'comments'] as const,
  attachments: (id: string) => ['tasks', id, 'attachments'] as const,
  timeEntries: (id: string) => ['tasks', id, 'time-entries'] as const,
  projects: () => ['projects'] as const,
  projectDetail: (id: string) => ['projects', id] as const,
  tags: () => ['tags'] as const,
}
