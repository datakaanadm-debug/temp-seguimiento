'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/icon'
import { SectionTitle, PaperBadge } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

type Item = { t: string; who: string; due?: string; done: boolean }
type Group = { group: string; items: Item[] }

// Checklist por defecto (se conectará a /api/v1/onboarding cuando exista el módulo)
const DEFAULT_CHECKLIST: Group[] = [
  {
    group: 'Ingreso y documentación',
    items: [
      { t: 'Firmar contrato de prácticas', who: 'RRHH', due: '16 abr', done: true },
      { t: 'Subir identificación oficial y comprobante', who: 'Practicante', due: '17 abr', done: true },
      { t: 'Firmar NDA y reglamento interno', who: 'RRHH', due: '18 abr', done: true },
      { t: 'Completar formulario bancario', who: 'Practicante', due: '25 abr', done: false },
    ],
  },
  {
    group: 'Accesos y herramientas',
    items: [
      { t: 'Crear cuenta corporativa (correo)', who: 'TI', due: '16 abr', done: true },
      { t: 'Asignar laptop o equipo', who: 'TI', due: '16 abr', done: true },
      { t: 'Configurar VPN y credenciales', who: 'TI', due: '19 abr', done: false },
      { t: 'Invitación a workspace (Slack / MS Teams)', who: 'Líder', done: true },
    ],
  },
  {
    group: 'Orientación e integración',
    items: [
      { t: 'Introducción a la plataforma Interna (tour)', who: 'RRHH', due: '16 abr', done: true },
      { t: 'Reunión 1:1 con mentora asignada', who: 'Mentor', due: '19 abr', done: true },
      { t: 'Presentación con el equipo', who: 'Líder', due: '22 abr', done: true },
      { t: 'Definición de OKRs del primer mes', who: 'Líder', due: '23 abr', done: false },
    ],
  },
  {
    group: 'Capacitación base',
    items: [
      { t: 'Completar curso de seguridad de datos', who: 'Practicante', done: true },
      { t: 'Revisar playbook del equipo', who: 'Practicante', done: true },
      { t: 'Completar quiz de bienvenida', who: 'Practicante', done: false },
    ],
  },
]

export default function OnboardingPage() {
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST)

  const toggle = (gi: number, ii: number) => {
    setChecklist((prev) =>
      prev.map((g, i) =>
        i !== gi
          ? g
          : {
              ...g,
              items: g.items.map((item, j) => (j === ii ? { ...item, done: !item.done } : item)),
            },
      ),
    )
  }

  const total = checklist.reduce((a, g) => a + g.items.length, 0)
  const done = checklist.reduce((a, g) => a + g.items.filter((i) => i.done).length, 0)
  const pct = Math.round((done / total) * 100)

  return (
    <div className="mx-auto max-w-[1060px] px-7 py-5 pb-10">
      <SectionTitle
        kicker="Onboarding · Cohorte actual"
        title="Checklist de ingreso"
        sub={`${done} de ${total} pasos completados · avanza a tu ritmo`}
        right={
          <>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[5px] text-[12px] text-ink-2 hover:border-paper-line-soft"
            >
              <Icon.Attach size={12} />
              Exportar PDF
            </button>
          </>
        }
      />

      {/* Hero progress */}
      <div
        className="mb-5 grid items-center gap-5 rounded-lg border border-paper-line bg-paper-raised p-[22px]"
        style={{ gridTemplateColumns: 'auto 1fr auto' }}
      >
        <div className="relative h-20 w-20">
          <svg width={80} height={80} viewBox="0 0 80 80">
            <circle
              cx={40}
              cy={40}
              r={34}
              fill="none"
              stroke="hsl(var(--paper-line-soft))"
              strokeWidth={6}
            />
            <circle
              cx={40}
              cy={40}
              r={34}
              fill="none"
              stroke="hsl(var(--accent-h))"
              strokeWidth={6}
              strokeDasharray={`${(pct / 100) * 213.6} 213.6`}
              strokeLinecap="round"
              transform="rotate(-90 40 40)"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center font-serif text-[18px]">
            {pct}%
          </div>
        </div>
        <div>
          <div className="mb-1 font-serif text-[22px] tracking-tight">
            {pct === 100 ? 'Onboarding completado 🎉' : 'Avanza paso a paso'}
          </div>
          <div className="text-[13px] text-ink-2">
            {pct === 100
              ? 'Todos los pasos están listos. ¡Éxito con tus primeros proyectos!'
              : `Faltan ${total - done} pasos — cada uno toma entre 5 y 20 min.`}
          </div>
          <div className="mt-2.5 flex gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-sm',
                  i < done ? 'bg-primary' : 'bg-paper-line-soft',
                )}
              />
            ))}
          </div>
        </div>
        <div className="text-center">
          <div className="font-mono text-[11px] text-ink-3">DÍA</div>
          <div className="font-serif text-[38px] leading-none">12</div>
          <div className="font-mono text-[11px] text-ink-3">de 90</div>
        </div>
      </div>

      {/* Groups */}
      {checklist.map((g, gi) => {
        const gDone = g.items.filter((i) => i.done).length
        return (
          <div key={gi} className="mb-3.5">
            <div className="mb-2 flex items-center gap-2.5">
              <span className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
                {String(gi + 1).padStart(2, '0')}
              </span>
              <span className="text-[14px] font-semibold text-ink">{g.group}</span>
              <span className="h-px flex-1 bg-paper-line" />
              <span className="font-mono text-[11px] text-ink-3">
                {gDone}/{g.items.length}
              </span>
            </div>
            <div className="overflow-hidden rounded-lg border border-paper-line bg-paper-raised">
              {g.items.map((it, ii) => (
                <label
                  key={ii}
                  className={cn(
                    'grid cursor-pointer items-center gap-3 px-3.5 py-2.5 transition hover:bg-paper-bg-2',
                    ii < g.items.length - 1 && 'border-b border-paper-line-soft',
                  )}
                  style={{ gridTemplateColumns: '24px 1fr auto auto' }}
                >
                  <input
                    type="checkbox"
                    checked={it.done}
                    onChange={() => toggle(gi, ii)}
                    className="h-4 w-4 accent-primary"
                  />
                  <div>
                    <div
                      className={cn(
                        'text-[13px]',
                        it.done ? 'text-ink-3 line-through' : 'text-ink',
                      )}
                    >
                      {it.t}
                    </div>
                    <div className="mt-0.5 text-[11px] text-ink-3">
                      Responsable: <b className="text-ink-2">{it.who}</b>
                      {it.due && (
                        <>
                          {' · vence '}
                          <b className="text-ink-2">{it.due}</b>
                        </>
                      )}
                    </div>
                  </div>
                  {it.due && !it.done && (
                    <PaperBadge tone="warn" className="!text-[10px]">
                      pendiente
                    </PaperBadge>
                  )}
                  {it.done ? (
                    <Icon.Check size={14} className="text-success" />
                  ) : (
                    <Icon.Chev size={12} className="text-ink-muted" />
                  )}
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
