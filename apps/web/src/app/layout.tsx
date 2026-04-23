import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/providers/query-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'Interna', template: '%s · Interna' },
  description: 'Plataforma de gestión de practicantes',
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0891B2',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <NuqsAdapter>
          <QueryProvider>
            <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          </QueryProvider>
        </NuqsAdapter>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}
