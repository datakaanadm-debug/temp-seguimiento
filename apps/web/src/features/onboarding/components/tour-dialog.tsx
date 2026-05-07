'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Icon, type IconName } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

interface TourStep {
  icon: IconName
  tone: string
  title: string
  desc: string
  cta: string
  href: string
}

const STEPS: TourStep[] = [
  {
    icon: 'Log',
    tone: 'hsl(var(--tag-1))',
    title: 'Reporta tu día',
    desc: 'Cada día dedica 60 segundos a documentar avances, próximos pasos y bloqueos. Tu líder y mentor lo ven en tiempo real.',
    cta: 'Ir a la bitácora',
    href: '/reportes-diarios/hoy',
  },
  {
    icon: 'Tasks',
    tone: 'hsl(var(--tag-2))',
    title: 'Gestiona tus tareas',
    desc: 'Usa el tablero Kanban o la lista para mover tareas entre estados. Filtra por prioridad, estado o asignado y encuentra lo que necesitas.',
    cta: 'Ver mis tareas',
    href: '/tareas?mine=true',
  },
  {
    icon: 'Mentor',
    tone: 'hsl(var(--tag-3))',
    title: 'Habla con tu mentor',
    desc: 'Revisa próximas sesiones 1:1, lee notas compartidas y lleva seguimiento de tus objetivos Q2.',
    cta: 'Abrir mentoría',
    href: '/mentoria',
  },
  {
    icon: 'Sparkles',
    tone: 'hsl(var(--tag-4))',
    title: 'Gana logros',
    desc: 'Cada acción suma puntos: reportes al día, completar OKRs, ayudar a compañeros. Mira tu progreso y desbloquea badges.',
    cta: 'Ver mis logros',
    href: '/logros',
  },
]

export function TourDialog({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onComplete: () => void
}) {
  const [i, setI] = useState(0)
  const step = STEPS[i]!
  const Icn = Icon[step.icon]
  const isLast = i === STEPS.length - 1

  const next = () => {
    if (isLast) {
      onComplete()
      onOpenChange(false)
      setI(0)
      return
    }
    setI((x) => x + 1)
  }

  const close = () => {
    onOpenChange(false)
    setI(0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] border-paper-line bg-paper-raised p-0">
        <div
          className="flex flex-col items-center gap-4 px-8 pt-10 pb-6 text-center"
          style={{ background: `linear-gradient(180deg, ${step.tone}14, transparent 60%)` }}
        >
          <div
            className="grid h-16 w-16 place-items-center rounded-2xl text-white"
            style={{ background: step.tone }}
          >
            <Icn size={28} />
          </div>
          <div>
            <div className="mb-0.5 font-mono text-[10.5px] uppercase tracking-[0.6px] text-ink-3">
              Paso {i + 1} de {STEPS.length}
            </div>
            <div className="font-serif text-[24px] leading-tight tracking-tight text-ink">
              {step.title}
            </div>
          </div>
          <p className="mx-auto max-w-[380px] text-[13.5px] leading-[1.55] text-ink-2">
            {step.desc}
          </p>
        </div>

        <div className="flex items-center gap-2 border-t border-paper-line-soft px-6 py-4">
          <div className="flex gap-1">
            {STEPS.map((_, idx) => (
              <span
                key={idx}
                className={cn(
                  'h-1.5 w-6 rounded-full transition-colors',
                  idx <= i ? 'bg-ink' : 'bg-paper-line',
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={close}
            className="ml-auto rounded-md px-2.5 py-[5px] text-[12px] text-ink-3 hover:bg-paper-bg-2 hover:text-ink"
          >
            Saltar
          </button>
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2"
          >
            {isLast ? (
              <>
                <Icon.Check size={12} />
                Completar tour
              </>
            ) : (
              <>
                Siguiente
                <Icon.Chev size={12} />
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
