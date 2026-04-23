/**
 * Config de runtime del cliente. NEXT_PUBLIC_* están disponibles client-side.
 * Otras variables solo en server components / route handlers.
 */

export const config = {
  apiUrl:
    process.env.NEXT_PUBLIC_API_URL ??
    'http://api.interna.test:8000',
  frontendUrl:
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://interna.test:3000',
  rootDomain:
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ??
    'interna.test',

  reverb: {
    appKey: process.env.NEXT_PUBLIC_REVERB_APP_KEY ?? '',
    host: process.env.NEXT_PUBLIC_REVERB_HOST ?? 'reverb.interna.test',
    port: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
    scheme: (process.env.NEXT_PUBLIC_REVERB_SCHEME ?? 'http') as 'http' | 'https',
  },

  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  env: process.env.NODE_ENV,
} as const
