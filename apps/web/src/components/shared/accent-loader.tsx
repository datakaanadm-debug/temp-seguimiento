'use client'

import { useEffect } from 'react'
import { useAuth } from '@/providers/auth-provider'

/**
 * Aplica `data-accent` al `<html>` desde el `tenant.theme.brand_accent`.
 *
 * Hace que el sistema de theming en `globals.css` (selectores
 * `[data-accent='cobalt']`, `[data-accent='terracotta']`, etc.) realmente
 * surta efecto. Sin este loader el selector de la página de empresa era
 * decorativo: guardaba el valor en BD pero no se aplicaba visualmente.
 *
 * Comportamiento:
 *   - Lee `tenant.theme.brand_accent` (string slug, ej. 'dkn').
 *   - Si existe, setea `<html data-accent="...">`. Las CSS vars
 *     `--accent-h`, `--accent-ink`, `--accent-soft` se override globalmente.
 *   - Si no hay theme cargado (auth en flight), conserva lo que ya esté.
 *   - Cleanup: NO removemos el atributo en unmount para evitar flash a
 *     cobalt cuando navegas; el valor persiste hasta que cambie el tenant.
 */
export function AccentLoader() {
  const { tenant } = useAuth()
  const accent = (tenant?.theme as Record<string, unknown> | undefined)?.brand_accent

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (typeof accent !== 'string' || !accent) return

    document.documentElement.setAttribute('data-accent', accent)
  }, [accent])

  return null
}
