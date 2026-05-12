'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { Tenant, User } from '@/types/api'

interface AuthContextValue {
  user: User | null
  tenant: Tenant | null
  setUser: (u: User | null) => void
  setTenant: (t: Tenant | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({
  initialUser,
  initialTenant,
  children,
}: {
  initialUser: User | null
  initialTenant: Tenant | null
  children: ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(initialUser)
  const [tenant, setTenant] = useState<Tenant | null>(initialTenant)
  // Una vez disparado el redirect, ignoramos otros 401 hasta que la URL cambie.
  // Sin esto, varias requests en paralelo (notifications, presence, heartbeat)
  // disparan N redirects y N re-renders con user=null.
  const redirectingRef = useRef(false)

  useEffect(() => {
    const onUnauthorized = () => {
      if (redirectingRef.current) return
      redirectingRef.current = true
      // No seteamos user=null acá. Los componentes downstream que llaman
      // useCurrentUser() seguirían reading el user "viejo" hasta que la
      // navegación a /login desmonte el árbol — evita pantallazo blanco
      // por throw en el medio del redirect.
      router.replace('/login')
    }
    window.addEventListener('auth:unauthorized', onUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized)
  }, [router])

  return (
    <AuthContext.Provider value={{ user, tenant, setUser, setTenant }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useCurrentUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error('No authenticated user in context')
  return user
}

export function useCurrentTenant(): Tenant {
  const { tenant } = useAuth()
  if (!tenant) throw new Error('No tenant in context')
  return tenant
}
