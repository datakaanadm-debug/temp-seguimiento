'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api-client'
import {
  changeTaskState, createTask, deleteTask, updateTask,
  type CreateTaskInput, type UpdateTaskInput,
} from '../api/tasks'
import { taskKeys } from '../api/keys'
import type { Task, TaskState } from '@/types/api'

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: taskKeys.all })
      toast.success('Tarea creada')
      return res
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'No se pudo crear la tarea'
      toast.error(msg)
    },
  })
}

export function useUpdateTask(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateTaskInput) => updateTask(id, input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: taskKeys.detail(id) })
      const prev = qc.getQueryData<Task>(taskKeys.detail(id))
      if (prev) {
        qc.setQueryData<Task>(taskKeys.detail(id), { ...prev, ...input } as Task)
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(taskKeys.detail(id), ctx.prev)
      toast.error('No se pudo actualizar la tarea')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: taskKeys.detail(id) })
      qc.invalidateQueries({ queryKey: ['tasks', 'list'] })
    },
  })
}

export function useChangeTaskState(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { state: TaskState; reason?: string }) =>
      changeTaskState(id, input.state, input.reason),
    onMutate: async ({ state }) => {
      await qc.cancelQueries({ queryKey: taskKeys.detail(id) })
      const prev = qc.getQueryData<Task>(taskKeys.detail(id))
      if (prev) {
        qc.setQueryData<Task>(taskKeys.detail(id), { ...prev, state })
      }
      // Optimistic en listas también
      qc.setQueriesData<any>({ queryKey: ['tasks', 'list'] }, (old: any) => {
        if (!old?.data) return old
        return {
          ...old,
          data: old.data.map((t: Task) => (t.id === id ? { ...t, state } : t)),
        }
      })
      return { prev }
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(taskKeys.detail(id), ctx.prev)
      const msg = err instanceof ApiError ? err.message : 'No se pudo cambiar el estado'
      toast.error(msg)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: taskKeys.detail(id) })
      qc.invalidateQueries({ queryKey: ['tasks', 'list'] })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all })
      toast.success('Tarea eliminada')
    },
    onError: () => toast.error('No se pudo eliminar'),
  })
}
