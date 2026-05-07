'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createDepartment } from '@/features/organization/api/organization'

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

export function NewDepartmentDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [touched, setTouched] = useState(false)

  const create = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      toast.success('Departamento creado')
      qc.invalidateQueries({ queryKey: ['departments'] })
      setName(''); setSlug(''); setTouched(false)
      onOpenChange(false)
    },
    onError: (e: any) => toast.error(e?.errors?.slug?.[0] ?? e?.message ?? 'No se pudo crear'),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    create.mutate({ name: name.trim(), slug: (slug || slugify(name)).trim() })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] border-paper-line bg-paper-raised">
        <DialogHeader>
          <DialogTitle className="font-serif text-[20px] text-ink">Nuevo departamento</DialogTitle>
          <p className="text-[12.5px] text-ink-3">
            Los departamentos agrupan áreas y equipos. Ej: Producto, Operaciones, Marketing.
          </p>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <label className="grid gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">Nombre</span>
            <input
              type="text" required autoFocus value={name}
              onChange={(e) => { setName(e.target.value); if (!touched) setSlug(slugify(e.target.value)) }}
              placeholder="Ej. Producto"
              className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
            />
          </label>
          <label className="grid gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">Slug (URL)</span>
            <input
              type="text" required value={slug}
              onChange={(e) => { setTouched(true); setSlug(slugify(e.target.value)) }}
              placeholder="producto"
              className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] font-mono text-[13px] text-ink outline-none focus:border-primary"
            />
          </label>
          <DialogFooter className="mt-2">
            <button type="button" onClick={() => onOpenChange(false)}
              className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink-2 hover:bg-paper-bg-2">
              Cancelar
            </button>
            <button type="submit" disabled={create.isPending || !name.trim()}
              className="rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2 disabled:opacity-50">
              {create.isPending ? 'Creando…' : 'Crear'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
