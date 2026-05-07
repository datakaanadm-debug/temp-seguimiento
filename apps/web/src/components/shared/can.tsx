'use client'

import { type ReactNode } from 'react'
import { useCan } from '@/hooks/use-can'
import type { Capability } from '@/lib/rbac/capabilities'

export function Can({
  capability,
  children,
  fallback = null,
}: {
  capability: Capability
  children: ReactNode
  fallback?: ReactNode
}) {
  const allowed = useCan(capability)
  if (!allowed) return <>{fallback}</>
  return <>{children}</>
}
