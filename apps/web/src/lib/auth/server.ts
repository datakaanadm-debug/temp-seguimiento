import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { apiClientServer, ApiError } from '@/lib/api-client'
import type { DataEnvelope, Tenant, User } from '@/types/api'

/**
 * Obtiene el user + tenant desde server components.
 * Si no hay sesión devuelve null — la page decide redirect.
 */
export async function getSessionServer(): Promise<{ user: User; tenant: Tenant } | null> {
  const cookieStore = await cookies()
  try {
    const res = await apiClientServer(cookieStore).get<{ user: User; tenant: Tenant }>(
      '/api/v1/auth/me',
    )
    return res
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 400)) {
      return null
    }
    throw err
  }
}

/**
 * Guard de rutas autenticadas. Usar en layouts del grupo `(app)`.
 */
export async function requireSession(): Promise<{ user: User; tenant: Tenant }> {
  const session = await getSessionServer()
  if (!session) {
    redirect('/login')
  }
  return session
}

/**
 * Fetcher tipado para paginated endpoints desde server components.
 */
export async function fetchFromServer<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const cookieStore = await cookies()
  const client = apiClientServer(cookieStore)
  return client.get<T>(path, { searchParams: params as any })
}

export type { DataEnvelope }
