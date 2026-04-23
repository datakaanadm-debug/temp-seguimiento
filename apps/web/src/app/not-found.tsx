import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-dvh grid place-items-center bg-muted/30 p-6">
      <div className="text-center space-y-4">
        <div className="text-6xl font-semibold text-muted-foreground">404</div>
        <h1 className="text-xl font-semibold">No encontramos esta página</h1>
        <p className="text-sm text-muted-foreground">La ruta solicitada no existe o fue movida.</p>
        <Button asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  )
}
