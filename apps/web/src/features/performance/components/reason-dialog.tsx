'use client'

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

/**
 * Dialog minimalista de "razón / nota" para acciones que cambian estado de
 * una evaluación (Disputar, Resolver disputa, Cancelar). Mismo shape, sólo
 * cambia el copy.
 */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  placeholder,
  confirmLabel,
  confirmTone = 'primary',
  requireText = false,
  isPending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: string
  placeholder?: string
  confirmLabel: string
  confirmTone?: 'primary' | 'destructive'
  /** Si true, el botón confirm queda deshabilitado hasta que haya texto. */
  requireText?: boolean
  isPending?: boolean
  onConfirm: (reason: string | null) => void | Promise<void>
}) {
  const [text, setText] = useState('')

  useEffect(() => {
    if (!open) setText('')
  }, [open])

  const canConfirm = !isPending && (!requireText || text.trim().length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {description && (
            <p className="text-[12.5px] leading-relaxed text-ink-2">{description}</p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="reason-text">
              {requireText ? 'Motivo' : 'Motivo'} <span className="font-mono text-[10px] text-ink-3">{requireText ? 'requerido' : 'opcional'}</span>
            </Label>
            <textarea
              id="reason-text"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <DialogFooter className="!flex-row !justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={confirmTone === 'destructive' ? 'destructive' : 'default'}
            disabled={!canConfirm}
            onClick={() => onConfirm(text.trim() || null)}
          >
            {isPending ? 'Procesando…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
