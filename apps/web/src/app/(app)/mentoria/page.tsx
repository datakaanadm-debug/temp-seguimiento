'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/icon'
import {
  SectionTitle, PaperCard, PaperBadge, TonalAvatar,
} from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

// Stub mock hasta que exista el módulo Mentorship en el backend.
// Cuando exista: conectar a /api/v1/mentor-sessions, /api/v1/mentor-notes, /api/v1/growth-path.

const mentor = {
  id: 'm1',
  name: 'Sofía Beltrán',
  role: 'Sr. Designer · Mentora',
  tone: '#8a6b9e',
  email: 'sofia.beltran@acme-tech.com',
}

const NEXT_SESSION = {
  date: new Date(Date.now() + 86_400_000),
  duration: 30,
  topic: 'Revisión de sprint + plan de crecimiento Q2',
  location: 'Google Meet',
  agenda: [
    'Retro del sprint y aprendizajes',
    'Feedback sobre tu último entregable',
    'OKR Q2 — primera propuesta',
    'Bloqueos / preguntas',
  ],
}

const HISTORY = [
  { date: '9 abr', topic: 'Feedback sobre research & primeros bocetos', tags: ['research', 'feedback'] },
  { date: '25 mar', topic: 'Definición de plan de aprendizaje', tags: ['plan', 'objetivos'] },
  { date: '11 mar', topic: 'Kickoff + expectativas del programa', tags: ['onboarding'] },
]

const GROWTH_AREAS = [
  { skill: 'Fundamentos UX', progress: 90 },
  { skill: 'Systems thinking', progress: 68 },
  { skill: 'Facilitación', progress: 45 },
  { skill: 'Escritura clara', progress: 78 },
]

const Q_GOALS = [
  { text: 'Liderar una mini-feature de inicio a fin', done: false },
  { text: 'Presentar research a 2+ equipos', done: true },
  { text: 'Mentorizar a practicante junior', done: false },
]

export default function MentoriaPage() {
  const [privateNote, setPrivateNote] = useState(
    'Sofía me recomendó enfocarme en micro-interacciones en lugar de grandes rediseños. Piensa pequeño, itera rápido.\n\nPendiente: revisar referencias de Linear sobre command palettes antes del lunes.',
  )

  const dayOfWeek = NEXT_SESSION.date
    .toLocaleDateString('es-MX', { weekday: 'short' })
    .slice(0, 3)
    .toUpperCase()
  const dayNum = NEXT_SESSION.date.getDate()
  const hour = NEXT_SESSION.date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="mx-auto max-w-[1200px] px-7 py-5 pb-10">
      <SectionTitle
        kicker="Mentoría"
        title={`Sesiones 1:1 con ${mentor.name.split(' ')[0]}`}
        sub="Quincenal · próxima sesión mañana — 30 min"
        right={
          <>
            <button className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft">
              <Icon.Cal size={13} />
              Reprogramar
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-[7px] text-[13px] font-medium text-paper-surface hover:bg-ink-2">
              <Icon.Plus size={13} />
              Nueva nota
            </button>
          </>
        }
      />

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 300px' }}>
        {/* LEFT column */}
        <div className="flex min-w-0 flex-col gap-3.5">
          {/* Next session hero */}
          <div
            className="flex gap-[18px] rounded-lg border border-paper-line p-5"
            style={{
              background: 'linear-gradient(180deg, hsl(var(--paper-surface)), hsl(var(--paper-bg)))',
            }}
          >
            <div className="shrink-0 border-r border-paper-line pr-[18px] text-center">
              <div className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink-3">
                {dayOfWeek}
              </div>
              <div className="my-0.5 font-serif text-[38px] leading-none">{dayNum}</div>
              <div className="font-mono text-[11px] text-ink-3">
                {hour} – {addMinutes(hour, NEXT_SESSION.duration)}
              </div>
            </div>
            <div className="flex-1">
              <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.5px] text-ink-3">
                PRÓXIMA SESIÓN
              </div>
              <div className="mb-2 font-serif text-[22px] leading-tight tracking-tight text-ink">
                {NEXT_SESSION.topic}
              </div>
              <div className="mb-3.5 flex items-center gap-2.5 text-[13px]">
                <TonalAvatar size={24} name={mentor.name} tone={mentor.tone} />
                <span>{mentor.name}</span>
                <span className="text-[12px] text-ink-3">· {NEXT_SESSION.location}</span>
              </div>
              <div className="rounded-md border border-paper-line-soft bg-paper-surface p-3 text-[12.5px]">
                <div className="mb-1 flex items-center gap-1.5 font-semibold text-ink">
                  <Icon.Sparkles size={11} />
                  Agenda sugerida
                </div>
                <ol className="m-0 space-y-0.5 pl-5 leading-[1.6] text-ink-2">
                  {NEXT_SESSION.agenda.map((a, i) => (
                    <li key={i} className="list-decimal">
                      {a}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          {/* History */}
          <PaperCard
            title="Historial de sesiones"
            right={<button className="text-[12px] text-ink-3 hover:text-ink">Ver todas →</button>}
          >
            <div className="-my-2">
              {HISTORY.map((s, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-start gap-3 py-2.5',
                    i > 0 && 'border-t border-paper-line-soft',
                  )}
                >
                  <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-[11px] text-ink-3">{s.date}</span>
                      <span className="truncate text-[13px] font-medium text-ink">{s.topic}</span>
                    </div>
                    <div className="mt-1 flex gap-1.5">
                      {s.tags.map((t) => (
                        <PaperBadge key={t} tone="tag1" className="!text-[10px]">
                          #{t}
                        </PaperBadge>
                      ))}
                    </div>
                  </div>
                  <button className="shrink-0 text-[11px] text-ink-3 hover:text-ink">
                    Ver notas →
                  </button>
                </div>
              ))}
            </div>
          </PaperCard>

          {/* Private notes */}
          <PaperCard
            title="Notas privadas"
            right={
              <span className="inline-flex items-center gap-1 text-[11px] text-ink-3">
                <Icon.Sparkles size={11} /> solo tú las ves
              </span>
            }
          >
            <textarea
              value={privateNote}
              onChange={(e) => setPrivateNote(e.target.value)}
              rows={6}
              placeholder="Anota reflexiones, aprendizajes o preguntas para tu próxima sesión…"
              className="w-full resize-y rounded-md border border-paper-line-soft bg-paper-surface p-3 font-serif text-[15px] leading-[1.65] text-ink outline-none focus:border-primary"
            />
          </PaperCard>
        </div>

        {/* RIGHT column */}
        <div className="flex min-w-0 flex-col gap-3.5">
          <PaperCard title="Growth path">
            <div className="space-y-3">
              {GROWTH_AREAS.map((g) => (
                <div key={g.skill}>
                  <div className="mb-1 flex justify-between text-[12px]">
                    <span className="text-ink">{g.skill}</span>
                    <span className="font-mono text-ink-3">{g.progress}%</span>
                  </div>
                  <div className="h-[5px] overflow-hidden rounded-full bg-paper-line-soft">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${g.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </PaperCard>

          <PaperCard title="Objetivos Q2">
            <div className="-my-1">
              {Q_GOALS.map((g, i) => (
                <label
                  key={i}
                  className={cn(
                    'flex cursor-pointer items-start gap-2 py-2 text-[12.5px]',
                    i > 0 && 'border-t border-paper-line-soft',
                  )}
                >
                  <input
                    type="checkbox"
                    defaultChecked={g.done}
                    className="mt-0.5 h-3.5 w-3.5 accent-primary"
                  />
                  <span className={g.done ? 'text-ink-3 line-through' : 'text-ink'}>{g.text}</span>
                </label>
              ))}
            </div>
          </PaperCard>

          <PaperCard title="Recursos recomendados">
            <div className="flex flex-col gap-1">
              {['Refactoring UI · libro', 'Shape Up · ensayo', 'Linear command palette · video'].map(
                (r) => (
                  <button
                    key={r}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-ink-2 hover:bg-paper-bg-2 hover:text-ink"
                  >
                    <Icon.Attach size={11} className="text-ink-3" />
                    <span className="truncate">{r}</span>
                  </button>
                ),
              )}
            </div>
          </PaperCard>
        </div>
      </div>
    </div>
  )
}

function addMinutes(hourMin: string, minutes: number): string {
  const [h, m] = hourMin.split(':').map(Number)
  const total = (h ?? 0) * 60 + (m ?? 0) + minutes
  const newH = Math.floor(total / 60) % 24
  const newM = total % 60
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
}
