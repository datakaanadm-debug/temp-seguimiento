'use client'

import { useState, useRef, useEffect } from 'react'
import { Icon } from '@/components/ui/icon'
import { PaperBadge } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

type Message = {
  id: string
  role: 'assistant' | 'user'
  text: string
  time: string
}

const QUICK_PROMPTS = [
  '¿Qué debo priorizar hoy?',
  'Resume mi semana',
  'Ayúdame a escribir mi bitácora',
  'Detecta bloqueos en mi equipo',
]

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'm1',
    role: 'assistant',
    text: '¡Hola! Soy tu copiloto Interna. Puedo resumir bitácoras, sugerir prioridades, detectar bloqueos y proponer acciones. ¿En qué te ayudo?',
    time: 'ahora',
  },
]

/**
 * Coach IA flotante — aparece como FAB en esquina inferior derecha.
 * Cuando exista /api/v1/ai/chat se conecta ahí. Por ahora devuelve mock plausible.
 */
export function AiCoach() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const send = (text: string) => {
    if (!text.trim() || thinking) return
    const now = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    setMessages((m) => [
      ...m,
      { id: `u-${Date.now()}`, role: 'user', text, time: now },
    ])
    setInput('')
    setThinking(true)

    // Mock assistant response
    setTimeout(() => {
      const reply = mockReply(text)
      setMessages((m) => [
        ...m,
        { id: `a-${Date.now()}`, role: 'assistant', text: reply, time: now },
      ])
      setThinking(false)
    }, 900 + Math.random() * 800)
  }

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-paper-surface shadow-paper-3 transition-transform hover:scale-105',
          open && 'scale-0 opacity-0',
        )}
        aria-label="Abrir coach IA"
      >
        <Icon.Sparkles size={18} />
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 flex h-[560px] w-[400px] flex-col rounded-xl border border-paper-line bg-paper-raised shadow-paper-3 animate-fade-in"
          role="dialog"
          aria-label="Coach IA"
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b border-paper-line-soft p-3.5">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-ink text-paper-surface">
              <Icon.Sparkles size={14} />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-ink">Coach Interna</div>
              <div className="text-[10.5px] text-ink-3">IA contextual · siempre en beta</div>
            </div>
            <PaperBadge tone="accent" className="!text-[9px]">
              ONLINE
            </PaperBadge>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-ink-3 hover:text-ink"
              aria-label="Cerrar coach"
            >
              <Icon.X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-3.5">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn('flex gap-2', m.role === 'user' && 'justify-end')}
              >
                {m.role === 'assistant' && (
                  <div className="grid h-7 w-7 shrink-0 place-items-center self-end rounded-md bg-ink text-paper-surface">
                    <Icon.Sparkles size={11} />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-3 py-2 text-[12.5px] leading-[1.55]',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-paper-line-soft bg-paper-surface text-ink',
                  )}
                >
                  {m.text}
                  <div
                    className={cn(
                      'mt-1 font-mono text-[9.5px]',
                      m.role === 'user' ? 'text-primary-foreground/70' : 'text-ink-3',
                    )}
                  >
                    {m.time}
                  </div>
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex gap-2">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-ink text-paper-surface">
                  <Icon.Sparkles size={11} />
                </div>
                <div className="rounded-lg border border-paper-line-soft bg-paper-surface px-3 py-2.5">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-3" />
                    <span
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-3"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-3"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 border-t border-paper-line-soft p-2.5">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="rounded-full border border-paper-line bg-paper-surface px-2.5 py-1 text-[11px] text-ink-2 hover:border-paper-line-soft"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex items-center gap-2 border-t border-paper-line-soft p-2.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta algo al coach…"
              className="flex-1 rounded-md border border-paper-line bg-paper-surface px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              className="grid h-8 w-8 place-items-center rounded-md bg-ink text-paper-surface hover:bg-ink-2 disabled:opacity-40"
              aria-label="Enviar"
            >
              <Icon.Chev size={13} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}

function mockReply(prompt: string): string {
  const p = prompt.toLowerCase()
  if (p.includes('priorizar') || p.includes('hoy')) {
    return 'Para hoy priorizaría estas 3 tareas: (1) T-112 "Dashboard ejecutivo" — está en revisión y bloquea al líder; (2) T-118 "Research competidores" — vence viernes y llevas 2h de 5 estimadas; (3) la bitácora de ayer, que no enviaste. ¿Quieres que agende pomodoros?'
  }
  if (p.includes('resum') && p.includes('seman')) {
    return 'Esta semana completaste 4 tareas (meta 5), reportaste 4 de 5 días, y tus KPIs de calidad están arriba de la media del equipo (+12%). Punto de atención: 2 tareas vencieron sin marcar como bloqueadas — vale la pena mencionarlo en tu próximo 1:1.'
  }
  if (p.includes('bitácora') || p.includes('bitacora')) {
    return 'Te propongo este borrador basado en tus tareas de hoy:\n\n• Avancé el prototipo del dashboard ejecutivo (T-112) — subí mockups a Figma.\n• Sincronicé con el líder para alinear copy del onboarding.\n• Empecé research competitivo para landing v2.\n\n¿Lo publico como borrador o prefieres editarlo?'
  }
  if (p.includes('bloqueo')) {
    return 'Detecté 2 señales de bloqueo en tu equipo: Mateo I. con 3 tareas vencidas esta semana (patrón de atraso), y Diego H. con un comentario sin respuesta en T-128 hace 2 días. Te sugiero mencionarlo en el daily de mañana.'
  }
  return 'Entendido. Estoy trabajando en conectarme a tus datos reales para darte una respuesta precisa. Por ahora, ¿quieres que te ayude con una de las acciones rápidas?'
}
