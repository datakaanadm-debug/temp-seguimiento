'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { useTour, TOUR_STORAGE_KEY } from './use-tour'

/**
 * Mounted at app layout level. Detecta primera visita y lanza el tour
 * automáticamente si:
 *   - el user no tiene `tour_completed_at`
 *   - no fue dismissed en localStorage (sesión actual)
 *   - estamos en /, /mi-dia o /dashboard (rutas principales)
 *
 * Solo dispara una vez por user y por sesión.
 */
export function TourLauncher() {
  const { user } = useAuth()
  const pathname = usePathname()
  const { start } = useTour()
  const launchedRef = useRef(false)

  useEffect(() => {
    if (launchedRef.current) return
    if (!user) return
    if (user.tour_completed_at) return

    let dismissed = false
    try {
      dismissed = localStorage.getItem(TOUR_STORAGE_KEY) === '1'
    } catch {}
    if (dismissed) return

    const onMainPage =
      pathname === '/' || pathname === '/mi-dia' || pathname === '/dashboard'
    if (!onMainPage) return

    launchedRef.current = true
    const t = setTimeout(() => start(), 800)
    return () => clearTimeout(t)
  }, [user?.id, user?.tour_completed_at, pathname, start])

  return null
}
