'use client'

import { useEffect, useState } from 'react'

export function OfflineBanner() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setOnline(navigator.onLine)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (online) return null

  return (
    <div className="sticky top-0 z-40 bg-warning text-warning-foreground text-sm py-1.5 px-4 text-center">
      Sin conexión · viendo datos en caché. Los cambios no se guardarán hasta que vuelva la red.
    </div>
  )
}
