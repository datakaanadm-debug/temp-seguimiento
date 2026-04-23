'use client'

import { useEffect, useRef } from 'react'
import { getEcho } from '@/lib/realtime/echo'

/**
 * Suscribe a un channel private y un evento específico. Cleanup automático al desmontar
 * o al cambiar el channel. El `handler` se mantiene en ref para no reconectar en cada render.
 */
export function useRealtimeChannel<T = unknown>(
  channel: string | null | undefined,
  event: string,
  handler: (payload: T) => void,
  deps: unknown[] = [],
): void {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!channel) return
    const echo = getEcho()
    if (!echo) return

    echo.private(channel).listen(`.${event}`, (payload: T) => handlerRef.current(payload))
    return () => {
      echo.leave(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, event, ...deps])
}
