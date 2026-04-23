import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UniversityReportForm } from '@/features/reports/components/university-report-form'

export const metadata = { title: 'Reporte universidad' }

export default function SolicitarUniversidadPage() {
  return (
    <div className="container max-w-2xl py-6">
      <Card>
        <CardHeader>
          <CardTitle>Reporte para universidad</CardTitle>
          <CardDescription>
            Genera el PDF oficial con horas, KPIs, evaluaciones y actividad del practicante.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UniversityReportForm />
        </CardContent>
      </Card>
    </div>
  )
}
