'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { PaperBadge } from '@/components/ui/primitives'
import { useUiStore } from '@/lib/stores/ui-store'
import { cn } from '@/lib/utils'
import { sendChatMessage, type ChatMessage } from '@/features/ai/api/ai'

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
    text: '¡Hola! Soy tu copiloto Senda. Puedo resumir bitácoras, sugerir prioridades, detectar bloqueos y proponer acciones. ¿En qué te ayudo?',
    time: 'ahora',
  },
]

/**
 * Coach IA flotante — FAB en esquina inferior derecha.
 * Conectado a POST /api/v1/ai/chat con contexto del usuario (bitácora, tareas, sesiones).
 */
export function AiCoach() {
  const pathname = usePathname()
  // Estado en zustand para que cualquier CTA externo (ej. /ia "Abrir coach")
  // pueda dispararlo sin pasarse refs ni eventos.
  const open = useUiStore((s) => s.aiCoachOpen)
  const setOpen = useUiStore((s) => s.setAiCoachOpen)
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const send = async (text: string) => {
    if (!text.trim() || thinking) return
    const now = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

    const nextMessages: Message[] = [
      ...messages,
      { id: `u-${Date.now()}`, role: 'user', text, time: now },
    ]
    setMessages(nextMessages)
    setInput('')
    setThinking(true)

    try {
      const history: ChatMessage[] = nextMessages
        .filter((m) => m.id !== 'm1') // omite el greeting estático
        .map((m) => ({ role: m.role, content: m.text }))

      const res = await sendChatMessage({
        messages: history.length > 0 ? history : [{ role: 'user', content: text }],
        current_route: pathname ?? undefined,
      })

      const replyTime = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      setMessages((m) => [
        ...m,
        { id: `a-${Date.now()}`, role: 'assistant', text: res.data.content, time: replyTime },
      ])
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo contactar al coach IA')
      setMessages((m) => [
        ...m,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: 'Tuve un problema conectándome. Intenta de nuevo en un momento.',
          time: now,
        },
      ])
    } finally {
      setThinking(false)
    }
  }

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-tour="ai-coach-fab"
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
              <div className="text-[13px] font-semibold text-ink">Coach Senda</div>
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

