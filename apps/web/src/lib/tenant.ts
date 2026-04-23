import { config } from './config'

const STORAGE_KEY = 'interna.tenant_slug'
const COOKIE_NAME = 'tenant_slug'

function extractSubdomain(hostname: string, rootDomain: string): string | null {
  const root = rootDomain.replace(/^https?:\/\//, '').split(':')[0]!.toLowerCase()
  const host = hostname.toLowerCase()
  if (host === root) return null
  if (!host.endsWith(`.${root}`)) return null
  const sub = host.slice(0, -(root.length + 1))
  if (!sub || sub === 'www') return null
  return sub
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`))
  return match ? decodeURIComponent(match[1]!) : null
}

export function getTenantSlug(): string | null {
  if (typeof window === 'undefined') return null
  const sub = extractSubdomain(window.location.hostname, config.rootDomain)
  if (sub) return sub
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? readCookie(COOKIE_NAME)
  } catch {
    return readCookie(COOKIE_NAME)
  }
}

export function setTenantSlug(slug: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, slug)
  } catch {
    /* ignore */
  }
  const oneYear = 60 * 60 * 24 * 365
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(slug)}; Path=/; Max-Age=${oneYear}; SameSite=Lax`
}

export function clearTenantSlug(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`
}
