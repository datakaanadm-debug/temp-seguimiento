'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProject, type UpdateProjectInput } from '../api/tasks'
import type { Project } from '@/types/api'

const COLOR_PRESETS = [
  '#0891B2', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#0F172A',
]

const STATUS_OPTIONS: Array<{ value: NonNullable<UpdateProjectInput['status']>; label: string }> = [
  { value: 'active', label: 'Activo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'completed', label: 'Completado' },
  { value: 'archived', label: 'Archivado' },
]

/**
 * Dialog para editar metadata de un proyecto existente. No permite cambiar
 * `team_id` ni `slug` (decisión: el slug está en URLs y referencias, mover
 * de team requiere migrar tareas y team_memberships — fuera de scope).
 */
export function EditProjectDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  project: Project | null
}) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<NonNullable<UpdateProjectInput['status']>>('active')
  const [color, setColor] = useState<string>(COLOR_PRESETS[0]!)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Hidratar al abrir / cuando el proyecto cambia.
  useEffect(() => {
    if (open && project) {
      setName(project.name ?? '')
      setDescription(project.description ?? '')
      const initialStatus = (['active', 'paused', 'completed', 'archived'].includes(
        project.status as string,
      )
        ? project.status
        : 'active') as NonNullable<UpdateProjectInput['status']>
      setStatus(initialStatus)
      setColor(project.color ?? COLOR_PRESETS[0]!)
      setStartDate(project.start_date ?? '')
      setEndDate(project.end_date ?? '')
    }
  }, [open, project])

  const update = useMutation({
    mutationFn: (input: UpdateProjectInput) => updateProject(project!.id, input),
    onSuccess: () => {
      toast.success('Proyecto actualizado')
      qc.invalidateQueries({ queryKey: ['project', project!.id], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ['projects'], refetchType: 'all' })
      onOpenChange(false)
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.errors) {
          const firstField = Object.keys(err.errors)[0]
          const firstMsg = firstField ? err.errors[firstField]?.[0] : err.message
          toast.error(firstMsg ?? err.message)
          return
        }
        toast.error(err.message)
        return
      }
      toast.error('No se pudo actualizar el proyecto')
    },
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!project || !name.trim()) return
    update.mutate({
      name: name.trim(),
      description: description.trim() || null,
      status,
      color: color || null,
      start_date: startDate || null,
      end_date: endDate || null,
    })
  }

  if (!project) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Ajustes del proyecto</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ep-name">Nombre</Label>
            <Input
              id="ep-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ep-desc">
              Descripción
              <span className="ml-2 font-mono text-[10px] text-ink-3">opcional</span>
            </Label>
            <textarea
              id="ep-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={5000}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ep-status">Estado</Label>
              <select
                id="ep-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as NonNullable<UpdateProjectInput['status']>)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={
                      color === c
                        ? 'h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-background ring-ink'
                        : 'h-7 w-7 rounded-full ring-1 ring-paper-line hover:ring-ink-3'
                    }
                    style={{ background: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ep-start">Inicio</Label>
              <Input
                id="ep-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ep-end">Fin</Label>
              <Input
                id="ep-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
              />
            </div>
          </div>

          <DialogFooter className="!flex-row !justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={update.isPending || !name.trim()}>
              {update.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
