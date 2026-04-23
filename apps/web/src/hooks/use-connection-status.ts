'use client'

import { useEffect, useState } from 'react'
import { getEcho } from '@/lib/realtime/echo'

export type ConnectionStatus = 'initializing' | 'connecting' | 'connected' | 'unavailable' | 'failed'

export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>('initializing')

  useEffect(() => {
    const echo = getEcho()
    if (!echo) return
    const connector = (echo.connector as any)?.pusher?.connection
    if (!connector) return

    setStatus(connector.state ?? 'connecting')
    const onChange = ({ current }: { current: ConnectionStatus }) => setStatus(current)
    connector.bind('state_change', onChange)
    return () => connector.unbind('state_change', onChange)
  }, [])

  return status
}
