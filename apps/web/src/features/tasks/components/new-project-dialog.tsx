'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { listTeams } from '@/features/organization/api/organization'
import { createProject } from '../api/tasks'

const COLOR_PRESETS = [
  '#0891B2', // cyan
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#0F172A', // slate dark
]

/**
 * Genera un slug a partir del nombre: lowercase, espacios → guiones, sin
 * caracteres especiales, sin guiones al inicio/fin. Cumple el regex del
 * backend: `/^[a-z0-9][a-z0-9-]*[a-z0-9]$/`.
 */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

export function NewProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugDirty, setSlugDirty] = useState(false)
  const [teamId, setTeamId] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<string>(COLOR_PRESETS[0]!)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Reset al abrir/cerrar para no arrastrar estado entre ediciones.
  useEffect(() => {
    if (!open) {
      setName('')
      setSlug('')
      setSlugDirty(false)
      setTeamId('')
      setDescription('')
      setColor(COLOR_PRESETS[0]!)
      setStartDate('')
      setEndDate('')
    }
  }, [open])

  // Auto-derivar slug del nombre mientras el user no lo edite manualmente.
  useEffect(() => {
    if (!slugDirty) setSlug(slugify(name))
  }, [name, slugDirty])

  const { data: teamsData, isLoading: loadingTeams } = useQuery({
    queryKey: ['teams-for-new-project'],
    queryFn: () => listTeams(),
    enabled: open,
  })
  const teams = teamsData?.data ?? []

  const create = useMutation({
    mutationFn: createProject,
    onSuccess: (res) => {
      toast.success('Proyecto creado')
      qc.invalidateQueries({ queryKey: ['projects'], refetchType: 'all' })
      onOpenChange(false)
      // Devolvemos al usuario al detalle del proyecto recién creado para
      // que pueda configurar listas/tareas inmediatamente.
      if (typeof window !== 'undefined' && res?.data?.id) {
        window.location.href = `/proyectos/${res.data.id}`
      }
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        // 422: surfacear el primer error de validación. 409: slug duplicado.
        if (err.status === 422 && err.errors) {
          const firstField = Object.keys(err.errors)[0]
          const firstMsg = firstField ? err.errors[firstField]?.[0] : err.message
          toast.error(firstMsg ?? err.message)
          return
        }
        toast.error(err.message)
        return
      }
      toast.error('No se pudo crear el proyecto')
    },
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim() || !teamId) return
    create.mutate({
      team_id: teamId,
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      color: color || null,
      start_date: startDate || null,
      end_date: endDate || null,
      with_default_lists: true,
    })
  }

  const slugValid = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length >= 2

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Nuevo proyecto</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="proj-name">Nombre</Label>
            <Input
              id="proj-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Rediseño del onboarding"
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proj-slug">
              Slug
              <span className="ml-2 font-mono text-[10px] text-ink-3">
                único, identificador URL
              </span>
            </Label>
            <Input
              id="proj-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase())
                setSlugDirty(true)
              }}
              placeholder="rediseno-onboarding"
              maxLength={100}
              required
            />
            {slug && !slugValid && (
              <p className="text-[11px] text-destructive">
                Solo letras minúsculas, números y guiones. Sin guiones al inicio o final.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="proj-team">Equipo</Label>
            <select
              id="proj-team"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">— Selecciona un equipo —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {!loadingTeams && teams.length === 0 && (
              <p className="text-[11px] text-ink-3">
                No hay equipos. Crea uno primero en configuración antes de armar proyectos.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="proj-desc">
              Descripción
              <span className="ml-2 font-mono text-[10px] text-ink-3">opcional</span>
            </Label>
            <textarea
              id="proj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={5000}
              placeholder="Objetivo del proyecto, alcance, criterios…"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="proj-start">
                Inicio
                <span className="ml-2 font-mono text-[10px] text-ink-3">opcional</span>
              </Label>
              <Input
                id="proj-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proj-end">
                Fin
                <span className="ml-2 font-mono text-[10px] text-ink-3">opcional</span>
              </Label>
              <Input
                id="proj-end"
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
            <Button
              type="submit"
              disabled={
                create.isPending ||
                !name.trim() ||
                !slugValid ||
                !teamId ||
                teams.length === 0
              }
            >
              {create.isPending ? 'Creando…' : 'Crear proyecto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
