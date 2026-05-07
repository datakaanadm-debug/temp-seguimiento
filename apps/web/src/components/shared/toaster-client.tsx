'use client'

import { Toaster } from 'sonner'

/**
 * Wrapper client de sonner Toaster. Necesario en Next.js 15 con React 19
 * para que el portal del Toaster se inicialice correctamente — montarlo
 * directo en un Server Component (RootLayout) provoca que sonner
 * v1.7 no renderice. Sonner v2.x ya soporta React 19 oficialmente.
 */
export function ToasterClient() {
  return <Toaster position="top-right" richColors closeButton />
}
