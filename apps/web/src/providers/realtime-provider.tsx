'use client'

import { useEffect, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { initEcho, getEcho } from '@/lib/realtime/echo'

/**
 * Inicializa Echo una vez y maneja invalidación global tras gaps de conexión.
 * Los hooks por-feature hacen sus suscripciones específicas.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()

  useEffect(() => {
    initEcho()
    const echo = getEcho()
    if (!echo) return

    let lastDisconnect = 0
    const connector = (echo.connector as any)?.pusher?.connection
    if (!connector) return

    const onDisconnect = () => {
      lastDisconnect = Date.now()
    }
    const onConnect = () => {
      if (lastDisconnect > 0 && Date.now() - lastDisconnect > 5_000) {
        qc.invalidateQueries({ queryKey: ['tasks'] })
        qc.invalidateQueries({ queryKey: ['notifications'] })
        qc.invalidateQueries({ queryKey: ['daily-report'] })
      }
    }
    connector.bind('disconnected', onDisconnect)
    connector.bind('connected', onConnect)
    return () => {
      connector.unbind('disconnected', onDisconnect)
      connector.unbind('connected', onConnect)
    }
  }, [qc])

  return <>{children}</>
}
