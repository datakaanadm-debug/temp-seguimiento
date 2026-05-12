'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { RoleBadge } from './role-badge'
import type { FlowStep } from '../data/modules'

/**
 * Diagrama de flujo vertical (steps numerados conectados por línea).
 * Los steps se "iluminan" en cascada al montar — animación staggered de
 * 120ms por paso. Cada step muestra:
 *   - Indicador circular numerado (con check verde cuando "completed")
 *   - Label del paso + badge de rol responsable
 *   - Hint opcional (texto secundario)
 *
 * No usamos framer-motion ni librerías extra — sólo Tailwind transition
 * + setTimeout para el stagger.
 */
export function FlowDiagram({ steps }: { steps: FlowStep[] }) {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    setVisibleCount(0)
    const timers: ReturnType<typeof setTimeout>[] = []
    steps.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleCount((c) => Math.max(c, i + 1)), 200 + i * 130))
    })
    return () => timers.forEach(clearTimeout)
  }, [steps])

  return (
    <ol className="relative space-y-3 pl-1">
      {/* Línea vertical conectora — animada de top a bottom */}
      <span
        aria-hidden
        className="absolute left-[15px] top-2 w-px bg-paper-line"
        style={{
          height: `calc(${steps.length} * 56px)`,
          maxHeight: 'calc(100% - 16px)',
        }}
      />
      <span
        aria-hidden
        className="absolute left-[15px] top-2 w-px bg-gradient-to-b from-primary to-primary/0 transition-[height] duration-1000 ease-out"
        style={{
          height: `${(visibleCount / Math.max(steps.length, 1)) * 100}%`,
        }}
      />

      {steps.map((step, i) => {
        const visible = i < visibleCount
        return (
          <li
            key={i}
            className={cn(
              'relative flex gap-3 transition-all duration-500',
              visible ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0',
            )}
          >
            {/* Numerador */}
            <div
              className={cn(
                'relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 font-mono text-[11.5px] font-semibold transition-colors duration-500',
                visible
                  ? 'border-primary-ink bg-primary text-primary-foreground'
                  : 'border-paper-line bg-paper-raised text-ink-3',
              )}
            >
              {visible ? <Icon.Check size={13} /> : i + 1}
            </div>

            {/* Contenido */}
            <div className="min-w-0 flex-1 pb-2 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13.5px] font-medium text-ink">{step.label}</span>
                <RoleBadge role={step.actor} size="sm" />
              </div>
              {step.hint && (
                <div className="mt-1 text-[12px] leading-[1.5] text-ink-3">
                  {step.hint}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
