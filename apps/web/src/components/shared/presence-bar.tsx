'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { TonalAvatar } from '@/components/ui/primitives'

type Peer = {
  id: string
  name: string
  color: string
}

/**
 * PresenceBar — muestra avatares de quién más está viendo la misma pantalla.
 * UI lista para conectar a RealtimeProvider cuando los canales de Reverb
 * emitan 'presence:{route}' events. Por ahora usa mock estable por route.
 */
export function PresenceBar() {
  const pathname = usePathname()
  const [peers, setPeers] = useState<Peer[]>([])

  useEffect(() => {
    // Simulación: peers dependen de la ruta actual.
    // En producción conectar al realtime provider con channel = `route:${pathname}`.
    if (pathname.startsWith('/tareas') || pathname.startsWith('/proyectos')) {
      setPeers([
        { id: 'u1', name: 'Lucía Ramírez', color: '#456b7a' },
        { id: 'u2', name: 'Sofía Beltrán', color: '#8a6b9e' },
      ])
    } else if (pathname.startsWith('/reportes-diarios')) {
      setPeers([{ id: 'u3', name: 'Mara Villalobos', color: '#5a7a3f' }])
    } else {
      setPeers([])
    }
  }, [pathname])

  if (peers.length === 0) return null

  return (
    <div
      className="fixed bottom-6 left-6 z-30 flex items-center gap-1.5 rounded-full border border-paper-line bg-paper-raised py-1.5 pl-1.5 pr-3 shadow-paper-2 animate-fade-in"
      aria-label="Personas viendo esta pantalla"
    >
      <div className="flex -space-x-2">
        {peers.slice(0, 4).map((p) => (
          <div
            key={p.id}
            title={p.name}
            className="rounded-full border-2 border-paper-raised"
          >
            <TonalAvatar size={24} name={p.name} tone={p.color} />
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
            <b className="text-ink-2">{peers[0]!.name.split(' ')[0]}</b> está aquí
          </>
        ) : (
          <>
            <b className="text-ink-2">{peers[0]!.name.split(' ')[0]}</b>
            {peers.length === 2 ? ` y ${peers[1]!.name.split(' ')[0]}` : ` y ${peers.length - 1} más`}
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
