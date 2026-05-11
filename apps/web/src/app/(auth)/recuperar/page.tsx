import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Recuperar contraseña · Senda' }

/**
 * Placeholder honesto para recuperación de contraseña.
 *
 * Backend todavía no tiene el flujo (POST /auth/forgot-password + email
 * con token). Cuando esté implementado, reemplazar este archivo por un
 * formulario con email + envío.
 *
 * Mientras tanto, esta página existe para que el link "¿Olvidaste tu
 * contraseña?" de /login no rompa a 404 — la primera impresión es
 * crítica para confianza.
 */
export default function RecuperarPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar contraseña</CardTitle>
        <CardDescription>
          El flujo automático de recuperación todavía no está disponible.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          Por ahora, contacta al administrador de tu workspace para que te
          asigne una contraseña temporal:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Si eres practicante o mentor, escríbele a RRHH o al líder de tu equipo.</li>
          <li>Si eres administrador y no tienes a quién contactar, escribe a soporte: <a className="text-primary hover:underline" href="mailto:soporte@senda.app">soporte@senda.app</a></li>
        </ul>
        <p className="pt-2">
          <Link href="/login" className="text-primary hover:underline">← Volver al login</Link>
        </p>
      </CardContent>
    </Card>
  )
}
