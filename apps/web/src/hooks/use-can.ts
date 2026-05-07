'use client'

import { useAuth } from '@/providers/auth-provider'
import { roleHasCapability, type Capability } from '@/lib/rbac/capabilities'

export function useCan(cap: Capability): boolean {
  const { user } = useAuth()
  return roleHasCapability(user?.role, cap)
}
