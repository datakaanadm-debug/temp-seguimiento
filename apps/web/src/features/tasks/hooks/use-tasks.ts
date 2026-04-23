'use client'

import { useQuery } from '@tanstack/react-query'
import { listTasks, getTask } from '../api/tasks'
import { taskKeys, type ListTasksParams } from '../api/keys'

export function useTasks(params: ListTasksParams = {}) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => listTasks(params),
    staleTime: 10_000,
  })
}

export function useTask(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? taskKeys.detail(id) : ['tasks', 'detail', 'noop'],
    queryFn: () => getTask(id!).then((r) => r.data),
    enabled: !!id,
    staleTime: 15_000,
  })
}
