import type { NextConfig } from 'next'

/**
 * Derive remote image patterns desde env vars para que `next/image` permita
 * cargar logos del tenant servidos desde el API (Railway/R2/custom domain)
 * sin tener que recompilar cuando cambias de host.
 *
 * Si NEXT_PUBLIC_API_URL=https://api.senda.com → pattern para api.senda.com.
 * Vacío en local → fallback a localhost solamente.
 */
function dynamicRemotePatterns(): NonNullable<NonNullable<NextConfig['images']>['remotePatterns']> {
  const patterns: NonNullable<NonNullable<NextConfig['images']>['remotePatterns']> = [
    { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
    { protocol: 'https', hostname: '*.r2.dev' },
    { protocol: 'https', hostname: '*.up.railway.app' },
    { protocol: 'https', hostname: '*.vercel.app' },
    { protocol: 'https', hostname: '*.interna.app' },
    { protocol: 'https', hostname: '*.senda.com' },
    { protocol: 'http', hostname: 'localhost' },
    { protocol: 'http', hostname: '*.interna.test' },
  ]

  // Auto-whitelist el host del API si está seteado (ej. https://api.senda.com).
  try {
    if (process.env.NEXT_PUBLIC_API_URL) {
      const u = new URL(process.env.NEXT_PUBLIC_API_URL)
      patterns.push({
        protocol: u.protocol.replace(':', '') as 'http' | 'https',
        hostname: u.hostname,
      })
    }
  } catch {
    // URL inválida — ignorar silenciosamente.
  }

  return patterns
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // output: 'standalone' desactivado en dev Windows (exige symlinks). Activarlo en Docker prod.

  experimental: {
    typedRoutes: false,
  },

  // ESLint ya corre como check separado en CI (Vercel también lo expone como
  // PR check). En el build de producción evitamos que un warning de lint
  // bloquee el deploy de un fix urgente — TypeScript SÍ sigue bloqueando
  // (es lo que valida correctness, no estilo).
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    remotePatterns: dynamicRemotePatterns(),
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
    ]
  },
}

export default nextConfig
