/**
 * Wrapper alrededor de laravel-echo + pusher-js.
 *
 * - `initEcho()` es idempotente; solo inicializa una vez.
 * - `getEcho()` devuelve la instancia o undefined si no se ha inicializado.
 * - Solo corre en el cliente (typeof window === 'undefined' → no-op).
 */

import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { config } from '@/lib/config'

type EchoLike = Echo<any>

declare global {
  interface Window {
    Echo?: EchoLike
    Pusher?: typeof Pusher
  }
}

let initialized = false
let warnedMissingKey = false

export function initEcho(): void {
  if (typeof window === 'undefined' || initialized) return
  if (!config.reverb.appKey) {
    if (!warnedMissingKey) {
      warnedMissingKey = true
      console.info('[realtime] REVERB app key missing; realtime disabled')
    }
    return
  }
  initialized = true

  window.Pusher = Pusher

  window.Echo = new Echo({
    broadcaster: 'reverb',
    key: config.reverb.appKey,
    wsHost: config.reverb.host,
    wsPort: config.reverb.port,
    wssPort: config.reverb.port,
    forceTLS: config.reverb.scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${config.apiUrl}/api/v1/broadcasting/auth`,
    auth: { withCredentials: true } as any,
  })
}

export function getEcho(): EchoLike | undefined {
  if (typeof window === 'undefined') return undefined
  return window.Echo
}
