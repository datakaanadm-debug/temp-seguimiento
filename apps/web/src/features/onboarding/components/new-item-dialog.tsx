'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createItem } from '@/features/onboarding/api/onboarding'

export function NewOnboardingItemDialog({
  open,
  onOpenChange,
  internUserId,
  existingGroups,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  internUserId: string
  existingGroups: { name: string; order: number }[]
}) {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [groupMode, setGroupMode] = useState<'existing' | 'new'>('existing')
  const [groupName, setGroupName] = useState(existingGroups[0]?.name ?? 'General')
  const [newGroupName, setNewGroupName] = useState('')
  const [responsibleRole, setResponsibleRole] = useState<string>('')
  const [dueAt, setDueAt] = useState('')

  const create = useMutation({
    mutationFn: createItem,
    onSuccess: () => {
      toast.success('Paso añadido al checklist')
      qc.invalidateQueries({ queryKey: ['onboarding-checklist', internUserId] })
      setTitle('')
      setResponsibleRole('')
      setDueAt('')
      setNewGroupName('')
      onOpenChange(false)
    },
    onError: (err: any) => toast.error(err?.message ?? 'No se pudo añadir el paso'),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const resolvedGroup = groupMode === 'new' ? newGroupName.trim() : groupName
    if (!title.trim() || !resolvedGroup) return
    const groupOrder =
      groupMode === 'new'
        ? Math.max(0, ...existingGroups.map((g) => g.order)) + 1
        : existingGroups.find((g) => g.name === resolvedGroup)?.order ?? 99

    create.mutate({
      intern_user_id: internUserId,
      group_name: resolvedGroup,
      group_order: groupOrder,
      title: title.trim(),
      responsible_role: responsibleRole || undefined,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] border-paper-line bg-paper-raised">
        <DialogHeader>
          <DialogTitle className="font-serif text-[20px] text-ink">Añadir paso al checklist</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-3">
          <label className="grid gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">Título</span>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Leer manual de herramientas"
              className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
            />
          </label>

          <div className="grid gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">Grupo</span>
            <div className="inline-flex rounded-md border border-paper-line bg-paper-surface p-0.5">
              <button
                type="button"
                onClick={() => setGroupMode('existing')}
                className={`flex-1 rounded-[4px] px-2.5 py-[6px] text-[12px] transition ${
                  groupMode === 'existing'
                    ? 'bg-paper-bg-2 font-semibold text-ink'
                    : 'text-ink-3 hover:text-ink'
                }`}
              >
                Existente
              </button>
              <button
                type="button"
                onClick={() => setGroupMode('new')}
                className={`flex-1 rounded-[4px] px-2.5 py-[6px] text-[12px] transition ${
                  groupMode === 'new'
                    ? 'bg-paper-bg-2 font-semibold text-ink'
                    : 'text-ink-3 hover:text-ink'
                }`}
              >
                Nuevo
              </button>
            </div>
            {groupMode === 'existing' ? (
              <select
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="mt-1 rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
              >
                {existingGroups.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Nombre del nuevo grupo"
                className="mt-1 rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
                required
              />
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
                Responsable (opcional)
              </span>
              <select
                value={responsibleRole}
                onChange={(e) => setResponsibleRole(e.target.value)}
                className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
              >
                <option value="">—</option>
                <option value="hr">RH</option>
                <option value="mentor">Mentor</option>
                <option value="team_lead">Líder de equipo</option>
                <option value="intern">Practicante</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
                Vence (opcional)
              </span>
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
              />
            </label>
          </div>

          <DialogFooter className="mt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink-2 hover:bg-paper-bg-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={create.isPending || !title.trim()}
              className="rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2 disabled:opacity-50"
            >
              {create.isPending ? 'Añadiendo…' : 'Añadir paso'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
