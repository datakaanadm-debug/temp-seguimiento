import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DailyReportForm } from '@/features/tracking/components/daily-report-form'

export const metadata = { title: 'Reporte diario' }

export default function ReporteDiarioHoyPage() {
  return (
    <div className="container max-w-2xl py-6">
      <Card>
        <CardHeader>
          <CardTitle>Reporte diario</CardTitle>
          <CardDescription>
            Menos de 30 segundos. Tu líder y mentor lo recibirán automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DailyReportForm />
        </CardContent>
      </Card>
    </div>
  )
}
