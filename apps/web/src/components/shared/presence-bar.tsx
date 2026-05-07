'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { TonalAvatar } from '@/components/ui/primitives'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/providers/auth-provider'

type Peer = {
  user_id: string
  name: string
  email: string
  last_seen_at: number
}

const HEARTBEAT_MS = 20_000
const POLL_MS = 20_000

/**
 * PresenceBar — muestra quién más está en la misma sección.
 *
 * Usa heartbeat-based presence sin WebSocket:
 *   - Cliente hace POST /presence/heartbeat cada 20s con la ruta
 *   - Cliente hace GET /presence cada 20s para leer peers activos (TTL 60s)
 *
 * No se muestra cuando no hay otros usuarios. Al salir de la ruta el TTL
 * caduca automáticamente.
 */
export function PresenceBar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [peers, setPeers] = useState<Peer[]>([])

  useEffect(() => {
    if (!user) return

    let cancelled = false

    const heartbeat = () => {
      apiClient
        .post('/api/v1/presence/heartbeat', { path: pathname })
        .catch(() => { /* ignora fallos transitorios */ })
    }

    const refresh = async () => {
      try {
        const res = await apiClient.get<{ data: Peer[] }>('/api/v1/presence', {
          searchParams: { path: pathname },
        })
        if (!cancelled) setPeers(res.data ?? [])
      } catch {
        if (!cancelled) setPeers([])
      }
    }

    heartbeat()
    refresh()
    const hbId = setInterval(heartbeat, HEARTBEAT_MS)
    const pollId = setInterval(refresh, POLL_MS)

    return () => {
      cancelled = true
      clearInterval(hbId)
      clearInterval(pollId)
    }
  }, [pathname, user])

  if (peers.length === 0) return null

  const firstNames = peers.map((p) => (p.name ?? p.email).split(' ')[0])

  return (
    <div
      className="fixed bottom-6 left-6 z-30 flex items-center gap-1.5 rounded-full border border-paper-line bg-paper-raised py-1.5 pl-1.5 pr-3 shadow-paper-2 animate-fade-in"
      aria-label="Personas viendo esta pantalla"
    >
      <div className="flex -space-x-2">
        {peers.slice(0, 4).map((p) => (
          <div
            key={p.user_id}
            title={p.name ?? p.email}
            className="rounded-full border-2 border-paper-raised"
          >
            <TonalAvatar size={24} name={p.name ?? p.email} />
          </div>
        ))}
        {peers.length > 4 && (
          <div className="grid h-6 w-6 place-items-center rounded-full border-2 border-paper-raised bg-paper-bg-2 text-[10px] font-semibold text-ink-2">
            +{peers.length - 4}
          </div>
        )}
      </div>
      <span className="text-[11px] text-ink-3">
        {peers.length === 1 ? (
          <>
            <b className="text-ink-2">{firstNames[0]}</b> está aquí
          </>
        ) : peers.length === 2 ? (
          <>
            <b className="text-ink-2">{firstNames[0]}</b> y{' '}
            <b className="text-ink-2">{firstNames[1]}</b>
          </>
        ) : (
          <>
            <b className="text-ink-2">{firstNames[0]}</b> y {peers.length - 1} más
          </>
        )}
      </span>
      <span className="relative ml-1 flex h-2 w-2">
        <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
    </div>
  )
}
