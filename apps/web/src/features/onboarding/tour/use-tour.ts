'use client'

import { useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { driver, type Driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/providers/auth-provider'
import { getTourForRole, type TourStep } from './tour-configs'

export const TOUR_STORAGE_KEY = 'interna_tour_dismissed'

const ROUTE_NAV_DELAY_MS = 450

/**
 * Espera a que un selector exista en el DOM (con timeout de seguridad).
 */
function waitForSelector(selector: string, timeoutMs = 2000): Promise<Element | null> {
  return new Promise((resolve) => {
    const start = Date.now()
    const tick = () => {
      const el = document.querySelector(selector)
      if (el) return resolve(el)
      if (Date.now() - start >= timeoutMs) return resolve(null)
      requestAnimationFrame(tick)
    }
    tick()
  })
}

/**
 * Hook con acciones del tour. Expone `start()` y `reset()` para usar desde
 * cualquier botón. La auto-detección de primera visita vive en TourLauncher
 * para evitar disparar el tour más de una vez.
 */
export function useTour() {
  const router = useRouter()
  const { user, setUser } = useAuth()
  const driverRef = useRef<Driver | null>(null)
  const stepsRef = useRef<TourStep[]>([])
  const indexRef = useRef(0)
  const reachedEndRef = useRef(false)
  // Lock para evitar que múltiples clicks rápidos disparen `goToStep`
  // en paralelo y dejen driver.js con popover en step N pero highlight en N-1.
  const transitioningRef = useRef(false)

  const markCompleted = useCallback(async () => {
    try {
      const res = await apiClient.post<{ user: typeof user }>(
        '/api/v1/auth/me/tour-complete',
      )
      if (res.user) setUser(res.user as any)
    } catch {
      // silent
    }
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, '1')
    } catch {}
  }, [setUser])

  const start = useCallback(() => {
    if (!user) return
    const steps = getTourForRole(user.role)
    if (steps.length === 0) return

    if (driverRef.current) {
      try {
        driverRef.current.destroy()
      } catch {}
    }

    stepsRef.current = steps
    indexRef.current = 0
    reachedEndRef.current = false

    const lastIdx = steps.length - 1
    const driveSteps: DriveStep[] = steps.map((s, idx) => {
      const isLast = idx === lastIdx
      const isFirst = idx === 0
      return {
        element: s.element ?? undefined,
        popover: {
          title: s.popover.title,
          description: s.popover.description,
          side: s.popover.side,
          align: s.popover.align,
          showButtons: ['next', 'previous', 'close'],
          // En el último step usamos "Listo ✓" como next porque saltamos
          // con moveTo() y driver.js no detecta automáticamente que es done.
          nextBtnText: isLast ? 'Listo ✓' : 'Siguiente →',
          // En el primer step ocultamos visualmente "Atrás" deshabilitándolo
          // (driver.js no lo oculta con showButtons granular por step).
          prevBtnText: isFirst ? '' : '← Atrás',
          doneBtnText: 'Listo ✓',
        },
      }
    })

    /**
     * Si el step destino requiere otra ruta, navega primero, espera a que
     * el DOM monte el elemento + un par de frames extra (para que el sidebar
     * de Next.js termine su re-render con la clase activa nueva), y luego
     * fuerza a driver.js a saltar exactamente al step destino con `moveTo`.
     *
     * Usamos `moveTo(idx)` en vez de `moveNext/movePrevious` porque es
     * idempotente y permite a driver re-buscar el elemento — útil cuando
     * el componente al que apuntamos se desmontó y volvió a montar.
     */
    const goToStep = async (
      d: Driver,
      targetIdx: number,
      _direction: 'next' | 'prev',
    ) => {
      if (transitioningRef.current) return
      transitioningRef.current = true
      try {
        const target = stepsRef.current[targetIdx]
        if (!target) return
        const needsNav = target.route && target.route !== window.location.pathname

        if (needsNav) {
          router.push(target.route!)
          if (target.element) {
            await waitForSelector(target.element)
            // Un par de animation frames extra para que el sidebar termine
            // su re-render (clase activa nueva, layout shift mínimo).
            await new Promise((r) => requestAnimationFrame(() => r(null)))
            await new Promise((r) => requestAnimationFrame(() => r(null)))
          } else {
            await new Promise((r) => setTimeout(r, ROUTE_NAV_DELAY_MS))
          }
        }

        d.moveTo(targetIdx)
        indexRef.current = targetIdx
      } finally {
        transitioningRef.current = false
      }
    }

    const d = driver({
      steps: driveSteps,
      showProgress: true,
      progressText: '{{current}} / {{total}}',
      animate: true,
      smoothScroll: true,
      stagePadding: 6,
      stageRadius: 8,
      overlayOpacity: 0.55,
      onHighlightStarted: (_el, _step, opts) => {
        const idx = opts.state.activeIndex ?? 0
        indexRef.current = idx
      },
      onCloseClick: () => {
        try {
          localStorage.setItem(TOUR_STORAGE_KEY, '1')
        } catch {}
        d.destroy()
      },
      onDestroyed: () => {
        if (reachedEndRef.current) {
          markCompleted()
        }
      },
      // Usamos `indexRef.current` (no `opts.state.activeIndex`) porque
      // driver.js no siempre actualiza `activeIndex` cuando saltamos con
      // `moveTo` programáticamente — se queda en el último valor seteado
      // por `onHighlightStarted`. Nuestro ref sí se sincroniza al final
      // de cada `goToStep` y en `onHighlightStarted`, así que es la
      // fuente de verdad.
      onNextClick: () => {
        const i = indexRef.current
        if (i >= stepsRef.current.length - 1) {
          reachedEndRef.current = true
          d.destroy()
          return
        }
        void goToStep(d, i + 1, 'next')
      },
      onPrevClick: () => {
        const i = indexRef.current
        if (i <= 0) return
        void goToStep(d, i - 1, 'prev')
      },
    })

    driverRef.current = d

    // Para el step inicial: si requiere ruta distinta, navega antes de drive()
    const first = steps[0]
    if (first?.route && first.route !== window.location.pathname) {
      router.push(first.route)
      const sel = first.element
      const startWhenReady = async () => {
        if (sel) {
          await waitForSelector(sel)
        } else {
          await new Promise((r) => setTimeout(r, ROUTE_NAV_DELAY_MS))
        }
        d.drive()
      }
      void startWhenReady()
    } else {
      d.drive()
    }
  }, [user, router, markCompleted])

  const reset = useCallback(async () => {
    try {
      const res = await apiClient.post<{ user: typeof user }>(
        '/api/v1/auth/me/tour-reset',
      )
      if (res.user) setUser(res.user as any)
    } catch {}
    try {
      localStorage.removeItem(TOUR_STORAGE_KEY)
    } catch {}
    setTimeout(() => start(), 100)
  }, [setUser, start])

  return { start, reset }
}
