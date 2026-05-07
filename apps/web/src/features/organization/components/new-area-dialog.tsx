'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createArea } from '@/features/organization/api/organization'
import type { Department } from '@/types/api'

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

export function NewAreaDialog({
  open,
  onOpenChange,
  departments,
  defaultDepartmentId,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  departments: Department[]
  defaultDepartmentId?: string | null
}) {
  const qc = useQueryClient()
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId ?? '')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  const create = useMutation({
    mutationFn: createArea,
    onSuccess: () => {
      toast.success('Área creada')
      qc.invalidateQueries({ queryKey: ['departments'] })
      setName(''); setSlug('')
      onOpenChange(false)
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo crear'),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!departmentId || !name.trim()) return
    create.mutate({ department_id: departmentId, name: name.trim(), slug: (slug || slugify(name)).trim() })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] border-paper-line bg-paper-raised">
        <DialogHeader>
          <DialogTitle className="font-serif text-[20px] text-ink">Nueva área</DialogTitle>
          <p className="text-[12.5px] text-ink-3">
            Las áreas pertenecen a un departamento. Ej: Diseño, Frontend, Backend.
          </p>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <label className="grid gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">Departamento</span>
            <select value={departmentId} required onChange={(e) => setDepartmentId(e.target.value)}
              className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary">
              <option value="">— selecciona —</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">Nombre del área</span>
            <input type="text" required autoFocus value={name}
              onChange={(e) => { setName(e.target.value); setSlug(slugify(e.target.value)) }}
              placeholder="Ej. Diseño"
              className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
            />
          </label>
          <label className="grid gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">Slug</span>
            <input type="text" required value={slug} onChange={(e) => setSlug(slugify(e.target.value))}
              className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] font-mono text-[13px] text-ink outline-none focus:border-primary"
            />
          </label>
          <DialogFooter className="mt-2">
            <button type="button" onClick={() => onOpenChange(false)}
              className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink-2 hover:bg-paper-bg-2">
              Cancelar
            </button>
            <button type="submit" disabled={create.isPending || !name.trim() || !departmentId}
              className="rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2 disabled:opacity-50">
              {create.isPending ? 'Creando…' : 'Crear área'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
