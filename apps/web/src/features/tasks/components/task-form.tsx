'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateTask } from '../hooks/use-task-mutations'

const schema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1, 'Título requerido').max(300),
  description: z.string().max(50_000).optional().nullable(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).default('normal'),
  assignee_id: z.string().uuid().nullable().optional(),
  due_at: z.string().optional().nullable(),
  estimated_minutes: z.number().int().min(0).max(100_000).optional().nullable(),
})

type FormValues = z.infer<typeof schema>

export function TaskForm({ projectId, onCreated }: { projectId: string; onCreated?: (id: string) => void }) {
  const router = useRouter()
  const { mutateAsync, isPending } = useCreateTask()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      project_id: projectId,
      title: '',
      description: '',
      priority: 'normal',
      assignee_id: null,
      due_at: null,
      estimated_minutes: null,
    },
  })

  const onSubmit = async (data: FormValues) => {
    const res = await mutateAsync({
      ...data,
      description: data.description || null,
      due_at: data.due_at || null,
    })
    if (onCreated) onCreated(res.data.id)
    else router.push(`/tareas/${res.data.id}`)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...form.register('project_id')} />

      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          autoFocus
          placeholder="Ej. Rediseñar hero de landing"
          {...form.register('title')}
        />
        {form.formState.errors.title && (
          <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <textarea
          id="description"
          rows={5}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Detalles, enlaces, criterios de aceptación…"
          {...form.register('description')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority">Prioridad</Label>
          <select
            id="priority"
            {...form.register('priority')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="urgent">Urgente</option>
            <option value="high">Alta</option>
            <option value="normal">Normal</option>
            <option value="low">Baja</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="due_at">Fecha límite</Label>
          <Input
            id="due_at"
            type="datetime-local"
            {...form.register('due_at')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="estimated_minutes">Estimación (min)</Label>
        <Input
          id="estimated_minutes"
          type="number"
          min={0}
          placeholder="120"
          {...form.register('estimated_minutes', { valueAsNumber: true })}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creando…' : 'Crear tarea'}
        </Button>
      </div>
    </form>
  )
}
