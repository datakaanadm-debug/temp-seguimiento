'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import type { MembershipRole } from '@/types/api'

/**
 * Bloquea el acceso a la página si el rol del user no está en `allowed`.
 * Redirige a `fallback` (default: /mi-dia para intern, /dashboard para el resto).
 *
 * Úsalo en páginas que deberían ocultarse a roles específicos aunque el link
 * no aparezca en la sidebar (si el usuario escribe la URL directo, lo atajamos).
 */
export function useRequireRole(
  allowed: MembershipRole[],
  fallback?: string,
): boolean {
  const router = useRouter()
  const { user } = useAuth()

  const role = user?.role ?? null
  const permitted = role != null && allowed.includes(role)

  useEffect(() => {
    if (!user) return
    if (permitted) return
    const dest = fallback ?? (role === 'intern' ? '/mi-dia' : '/dashboard')
    router.replace(dest)
  }, [user, permitted, role, router, fallback])

  return permitted
}
