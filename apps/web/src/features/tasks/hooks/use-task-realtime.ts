'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRealtimeChannel } from '@/hooks/use-realtime-channel'
import { useCurrentTenant } from '@/providers/auth-provider'
import type { Task, TaskState } from '@/types/api'
import { taskKeys } from '../api/keys'

/**
 * Suscribe al canal del proyecto y muta la cache de TanStack Query.
 * No invalida listas largas; muta en-lugar para no disparar refetches.
 */
export function useTaskRealtime(projectId?: string | null) {
  const qc = useQueryClient()
  const tenant = useCurrentTenant()
  const channel = projectId ? `tenant.${tenant.id}.project.${projectId}` : null

  useRealtimeChannel<Task>(channel, 'task.created', (task) => {
    qc.setQueriesData<any>({ queryKey: ['tasks', 'list'] }, (old: any) => {
      if (!old?.data) return old
      if (old.data.some((t: Task) => t.id === task.id)) return old
      return { ...old, data: [...old.data, task] }
    })
  })

  useRealtimeChannel<Task>(channel, 'task.updated', (task) => {
    qc.setQueryData(taskKeys.detail(task.id), task)
    qc.setQueriesData<any>({ queryKey: ['tasks', 'list'] }, (old: any) => {
      if (!old?.data) return old
      return { ...old, data: old.data.map((t: Task) => (t.id === task.id ? task : t)) }
    })
  })

  useRealtimeChannel<{ id: string; to: TaskState }>(channel, 'task.state_changed', ({ id, to }) => {
    qc.setQueriesData<any>({ queryKey: ['tasks', 'list'] }, (old: any) => {
      if (!old?.data) return old
      return { ...old, data: old.data.map((t: Task) => (t.id === id ? { ...t, state: to } : t)) }
    })
    qc.setQueryData<Task | undefined>(taskKeys.detail(id), (prev) => (prev ? { ...prev, state: to } : prev))
  })

  useRealtimeChannel<{ id: string }>(channel, 'task.deleted', ({ id }) => {
    qc.setQueriesData<any>({ queryKey: ['tasks', 'list'] }, (old: any) => {
      if (!old?.data) return old
      return { ...old, data: old.data.filter((t: Task) => t.id !== id) }
    })
    qc.removeQueries({ queryKey: taskKeys.detail(id) })
  })
}
