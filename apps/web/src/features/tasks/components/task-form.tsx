'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/providers/auth-provider'
import { listMentorAssignments } from '@/features/people/api/people'
import { listObjectives } from '@/features/okrs/api/okrs'
import { useCreateTask } from '../hooks/use-task-mutations'
import type { PaginatedResponse, Profile } from '@/types/api'

const schema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1, 'Título requerido').max(300),
  description: z.string().max(50_000).optional().nullable(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).default('normal'),
  assignee_id: z.string().uuid().nullable().optional(),
  collaborator_ids: z.array(z.string().uuid()).max(15).optional().default([]),
  key_result_id: z.string().uuid().nullable().optional(),
  due_at: z.string().optional().nullable(),
  estimated_minutes: z.number().int().min(0).max(100_000).optional().nullable(),
})

type FormValues = z.infer<typeof schema>

export function TaskForm({ projectId, onCreated }: { projectId: string; onCreated?: (id: string) => void }) {
  const router = useRouter()
  const { user } = useAuth()
  const { mutateAsync, isPending } = useCreateTask()

  const isIntern = user?.role === 'intern'

  // Intern: solo puede asignarse a sí mismo o a su(s) mentor(es) asignado(s).
  // Staff: ve el directorio completo.
  const { data: peopleData } = useQuery({
    queryKey: ['profiles-task-assignee'],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Profile>>('/api/v1/profiles', {
        searchParams: { per_page: 100 },
      }),
    enabled: !isIntern,
  })
  const { data: mentorsOfMine } = useQuery({
    queryKey: ['task-assignee-mentors-mine', user?.id],
    queryFn: () => listMentorAssignments({ intern_user_id: user!.id, status: 'active' }),
    enabled: isIntern && !!user?.id,
  })

  // OKRs vinculables: para intern, sus propios objectives. Para staff,
  // todos del tenant. Filtramos los `completed` para no llenar el dropdown
  // de KRs cerrados.
  const { data: okrsData } = useQuery({
    queryKey: ['task-form-objectives', isIntern ? 'mine' : 'all'],
    queryFn: () =>
      listObjectives(isIntern ? { mine: true } : {}),
  })
  const krOptions = (okrsData?.data ?? [])
    .filter((o) => o.status !== 'completed')
    .flatMap((o) =>
      (o.key_results ?? [])
        .filter((kr) => kr.progress_percent < 100)
        .map((kr) => ({
          id: kr.id,
          label: `${o.label} → ${kr.text}`,
          quarter: o.quarter,
        })),
    )

  // El tipo de `user` es opcional (Profile.user?: User) — lo dejamos así
  // para que tanto los Profile[] del directorio como los stub que armamos
  // para el caso intern encajen en la misma lista.
  type Pickable = { user_id: string; user?: { name: string | null; email: string } | null }
  const people: Pickable[] = isIntern
    ? [
        // El propio intern primero
        ...(user
          ? [{
              user_id: user.id,
              user: { name: user.name, email: user.email },
            }]
          : []),
        // + sus mentores activos
        ...(mentorsOfMine?.data ?? []).flatMap((a) =>
          a.mentor
            ? [{
                user_id: a.mentor.id,
                user: { name: a.mentor.name, email: a.mentor.email },
              }]
            : [],
        ),
      ]
    : (peopleData?.data ?? [])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      project_id: projectId,
      title: '',
      description: '',
      priority: 'normal',
      assignee_id: null,
      collaborator_ids: [],
      key_result_id: null,
      due_at: null,
      estimated_minutes: null,
    },
  })

  const collaboratorIds = form.watch('collaborator_ids') ?? []
  const assigneeId = form.watch('assignee_id')

  const onSubmit = async (data: FormValues) => {
    const res = await mutateAsync({
      ...data,
      description: data.description || null,
      due_at: data.due_at || null,
      assignee_id: data.assignee_id || null,
      key_result_id: data.key_result_id || null,
      // Backend dedupea contra assignee_id, pero filtramos aquí también
      // para no enviar ruido si el usuario eligió a la misma persona en
      // ambos campos.
      collaborator_ids: (data.collaborator_ids ?? []).filter(
        (id) => id !== data.assignee_id,
      ),
    })
    if (onCreated) onCreated(res.data.id)
    else router.push(`/tareas/${res.data.id}`)
  }

  const toggleCollaborator = (uid: string) => {
    const current = form.getValues('collaborator_ids') ?? []
    if (current.includes(uid)) {
      form.setValue('collaborator_ids', current.filter((x) => x !== uid))
    } else {
      form.setValue('collaborator_ids', [...current, uid])
    }
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="assignee_id">Responsable principal</Label>
          <select
            id="assignee_id"
            {...form.register('assignee_id')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— sin asignar —</option>
            {people.map((p) => (
              <option key={p.user_id} value={p.user_id}>
                {p.user?.name ?? p.user?.email}
              </option>
            ))}
          </select>
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
      </div>

      {/* Colaboradores: solo para staff. Un intern no asigna a múltiples,
          modelo C dice que un practicante crea tareas para sí mismo + mentor. */}
      {!isIntern && (
        <div className="space-y-2">
          <Label>
            Colaboradores
            <span className="ml-2 font-mono text-[10px] text-ink-3">opcional</span>
          </Label>
          <p className="text-[11px] text-ink-3">
            Personas adicionales asignadas a esta tarea, además del responsable.
            Ven la tarea en su lista y pueden comentarla.
          </p>
          <div className="flex flex-wrap gap-1.5 rounded-md border border-input bg-background p-2 min-h-[44px]">
            {people
              .filter((p) => p.user_id !== assigneeId)
              .map((p) => {
                const checked = collaboratorIds.includes(p.user_id)
                return (
                  <button
                    key={p.user_id}
                    type="button"
                    onClick={() => toggleCollaborator(p.user_id)}
                    className={
                      checked
                        ? 'inline-flex items-center gap-1 rounded-full bg-primary px-2 py-[3px] text-[11px] text-primary-foreground'
                        : 'inline-flex items-center gap-1 rounded-full border border-paper-line bg-paper-surface px-2 py-[3px] text-[11px] text-ink-2 hover:border-paper-line-soft'
                    }
                  >
                    {checked && <span className="text-[9px]">✓</span>}
                    {p.user?.name?.split(' ')[0] ?? p.user?.email}
                  </button>
                )
              })}
          </div>
        </div>
      )}

      {krOptions.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="key_result_id">
            Vincular a OKR
            <span className="ml-2 font-mono text-[10px] text-ink-3">opcional</span>
          </Label>
          <select
            id="key_result_id"
            {...form.register('key_result_id')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— sin vincular —</option>
            {krOptions.map((kr) => (
              <option key={kr.id} value={kr.id}>
                [{kr.quarter}] {kr.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-ink-3">
            Si vinculas la tarea a un Key Result, su progreso se calcula automáticamente como % de tareas completadas.
          </p>
        </div>
      )}

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
