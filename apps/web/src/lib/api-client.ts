/**
 * apiClient — thin wrapper sobre fetch.
 *
 * - `credentials: 'include'` por default para cookies Sanctum cross-subdomain.
 * - XSRF token auto desde cookie.
 * - 401 → emite `auth:unauthorized` evento; provider redirige a /login.
 * - 4xx/5xx → lanza ApiError con payload normalizado.
 * - Funciona en RSC haciendo forward de cookies con `Next.headers()`.
 */

import { config } from './config'
import { getTenantSlug } from './tenant'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly payload?: unknown,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type SearchParamsInput =
  | string
  | string[][]
  | Record<string, string | number | boolean | null | undefined>

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  searchParams?: SearchParamsInput
  body?: unknown
  /** Cookies a forwardear cuando se llama desde server components. */
  forwardCookies?: string
}

function buildUrl(path: string, params?: SearchParamsInput): string {
  const base = config.apiUrl.replace(/\/+$/, '')
  const p = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`
  if (!params) return p

  const search = new URLSearchParams()
  if (Array.isArray(params) || typeof params === 'string') {
    return `${p}?${new URLSearchParams(params as any).toString()}`
  }
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '') return
    search.append(k, String(v))
  })
  const qs = search.toString()
  return qs ? `${p}?${qs}` : p
}

function getXsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]!) : null
}

async function request<T = unknown>(
  method: string,
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { searchParams, body, forwardCookies, headers: userHeaders, ...init } = opts
  const url = buildUrl(path, searchParams)

  const headers = new Headers(userHeaders)
  headers.set('Accept', 'application/json')

  if (body !== undefined && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const xsrf = getXsrfToken()
  if (xsrf) headers.set('X-XSRF-TOKEN', xsrf)

  if (!headers.has('X-Tenant-Slug')) {
    const slug = getTenantSlug()
    if (slug) headers.set('X-Tenant-Slug', slug)
  }

  if (forwardCookies) {
    headers.set('Cookie', forwardCookies)
  }

  const res = await fetch(url, {
    ...init,
    method,
    credentials: 'include',
    headers,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  })

  if (res.status === 204) return null as T

  const text = await res.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
    const message =
      (payload as any)?.message ?? `HTTP ${res.status} ${res.statusText}`
    const errors = (payload as any)?.errors
    throw new ApiError(res.status, message, payload, errors)
  }

  // Si el backend (middleware AppendRecentAwards) inyectó badges otorgadas
  // durante este request, dispara un evento global para que el listener
  // de UI muestre toast + invalide queries de gamification.
  if (
    typeof window !== 'undefined'
    && payload
    && typeof payload === 'object'
    && Array.isArray((payload as any)._awarded_badges)
    && (payload as any)._awarded_badges.length > 0
  ) {
    window.dispatchEvent(
      new CustomEvent('gamification:awards', {
        detail: (payload as any)._awarded_badges,
      }),
    )
  }

  return payload as T
}

export const apiClient = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('POST', path, { ...opts, body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('PUT', path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('PATCH', path, { ...opts, body }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, opts),
}

/**
 * Helper para usar en Server Components — forwardea cookies de Next al backend.
 *
 * Uso:
 *   import { cookies } from 'next/headers'
 *   const tasks = await apiClientServer(await cookies()).get<...>('...')
 */
export function apiClientServer(cookieStore: { getAll(): { name: string; value: string }[] }) {
  const all = cookieStore.getAll()
  const cookieHeader = all.map((c) => `${c.name}=${c.value}`).join('; ')
  const tenantSlug = all.find((c) => c.name === 'tenant_slug')?.value

  const withForward = <A extends unknown[], R>(
    fn: (path: string, ...rest: A) => Promise<R>,
  ) => {
    return (path: string, ...rest: A): Promise<R> => {
      const last = rest[rest.length - 1]
      const extraHeaders: Record<string, string> = {
        Referer: config.frontendUrl,
        Origin: config.frontendUrl,
      }
      if (tenantSlug) extraHeaders['X-Tenant-Slug'] = tenantSlug

      if (last && typeof last === 'object' && !Array.isArray(last)) {
        const opts = last as any
        opts.forwardCookies = cookieHeader
        opts.headers = { ...extraHeaders, ...(opts.headers ?? {}) }
      } else {
        rest.push({ forwardCookies: cookieHeader, headers: extraHeaders } as any)
      }
      return fn(path, ...rest)
    }
  }

  return {
    get: withForward(apiClient.get),
    post: withForward(apiClient.post as any),
    put: withForward(apiClient.put as any),
    patch: withForward(apiClient.patch as any),
    delete: withForward(apiClient.delete),
  } as typeof apiClient
}
