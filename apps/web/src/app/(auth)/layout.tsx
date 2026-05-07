export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh grid place-items-center bg-muted/30 p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-serif italic font-semibold">
            s
          </div>
          <div>
            <div className="text-xl font-semibold">Senda</div>
            <div className="text-xs text-muted-foreground">Gestión de practicantes</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
