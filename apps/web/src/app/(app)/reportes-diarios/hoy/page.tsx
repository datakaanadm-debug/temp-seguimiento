import Link from 'next/link'
import { Icon } from '@/components/ui/icon'
import { SectionTitle } from '@/components/ui/primitives'
import { DailyReportForm } from '@/features/tracking/components/daily-report-form'
import { getSessionServer } from '@/lib/auth/server'

export const metadata = { title: 'Reporte diario' }

export default async function ReporteDiarioHoyPage() {
  const session = await getSessionServer()
  const firstName = session?.user.name?.split(' ')[0] ?? ''

  return (
    <div className="mx-auto max-w-[980px] px-7 py-5 pb-10">
      <SectionTitle
        kicker={`Bitácora${firstName ? ` · ${firstName}` : ''}`}
        title="Reporte diario"
        sub="Documenta avances, próximos pasos y bloqueos. Tu líder y mentor pueden verlo."
        right={
          <>
            <Link
              href="/reportes-diarios"
              className="inline-flex items-center gap-1.5 rounded-md border border-paper-line bg-paper-raised px-2.5 py-[7px] text-[12px] text-ink-2 hover:border-paper-line-soft"
            >
              <Icon.Cal size={13} />
              Historial
            </Link>
          </>
        }
      />

      <DailyReportForm />
    </div>
  )
}
