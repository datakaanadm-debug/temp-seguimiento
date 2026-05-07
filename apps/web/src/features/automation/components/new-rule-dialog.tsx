'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  createAutomationRule,
  listAutomationTemplates,
  type AutomationTemplate,
} from '@/features/automation/api/automation'

export function NewRuleDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const qc = useQueryClient()
  const [picked, setPicked] = useState<AutomationTemplate | null>(null)
  const [title, setTitle] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['automation-templates'],
    queryFn: listAutomationTemplates,
    enabled: open,
  })
  const templates = data?.data ?? []

  const create = useMutation({
    mutationFn: createAutomationRule,
    onSuccess: () => {
      toast.success('Regla creada')
      qc.invalidateQueries({ queryKey: ['automation-rules'] })
      setPicked(null)
      setTitle('')
      onOpenChange(false)
    },
    onError: (err: any) => toast.error(err?.message ?? 'No se pudo crear la regla'),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!picked || !title.trim()) return
    create.mutate({
      title: title.trim(),
      description: picked.description,
      trigger_kind: picked.trigger_kind,
      trigger_config: picked.trigger_config,
      condition_config: picked.condition_config,
      actions_config: picked.actions_config,
      template_key: picked.key,
      enabled: true,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] border-paper-line bg-paper-raised">
        <DialogHeader>
          <DialogTitle className="font-serif text-[20px] text-ink">Nueva regla</DialogTitle>
          <p className="text-[12.5px] text-ink-3">
            Empieza desde una plantilla y personaliza el título. Podrás ajustar condiciones
            después.
          </p>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
              Plantilla
            </span>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="flex max-h-[280px] flex-col gap-1.5 overflow-y-auto pr-1">
                {templates.map((t) => {
                  const active = picked?.key === t.key
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setPicked(t)
                        if (!title.trim()) setTitle(t.title)
                      }}
                      className={`rounded-md border px-3 py-2 text-left transition ${
                        active
                          ? 'border-ink bg-paper-bg-2'
                          : 'border-paper-line hover:border-paper-line-soft'
                      }`}
                    >
                      <div className="text-[13px] font-medium text-ink">{t.title}</div>
                      <div className="mt-0.5 text-[11.5px] leading-snug text-ink-3">
                        {t.description}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <label className="grid gap-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.4px] text-ink-3">
              Título
            </span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre descriptivo de la regla"
              className="rounded-md border border-paper-line bg-paper-surface px-3 py-[7px] text-[13px] text-ink outline-none focus:border-primary"
            />
          </label>

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
              disabled={create.isPending || !picked || !title.trim()}
              className="rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2 disabled:opacity-50"
            >
              {create.isPending ? 'Creando…' : 'Crear regla'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
