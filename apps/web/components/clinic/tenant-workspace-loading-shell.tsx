import { Logo } from '@/components/brand';
import { Skeleton } from '@/components/ui/skeleton';

type LoadingShellVariant = 'generic' | 'clinic';

const CLINIC_SECTION_LABELS = ['Inicio', 'Operación', 'Seguimiento', 'Análisis'];
const GENERIC_SECTION_LABELS = ['Inicio', 'Espacios', 'Actividad'];

export function TenantWorkspaceLoadingShell({
  variant = 'generic',
}: {
  variant?: LoadingShellVariant;
}) {
  const sectionLabels = variant === 'clinic' ? CLINIC_SECTION_LABELS : GENERIC_SECTION_LABELS;

  return (
    <div
      className="surface-app flex min-h-screen flex-col bg-background"
      data-testid="tenant-workspace-loading-shell"
      data-variant={variant}
    >
      <div className="flex flex-1">
        <aside className="hidden w-72 shrink-0 border-r border-border/60 bg-sidebar lg:flex lg:flex-col">
          <div className="flex h-16 items-center border-b border-border/60 px-4">
            <Logo variant="sidebar" />
          </div>

          <div className="flex-1 space-y-6 px-4 py-6">
            {sectionLabels.map((label, index) => (
              <div key={label} className="space-y-3">
                <p className="px-2 text-editorial-tiny uppercase tracking-[0.05em] text-muted-foreground">
                  {label}
                </p>
                <div className="space-y-2">
                  {Array.from({ length: index === 0 ? 1 : 2 }).map((_, itemIndex) => (
                    <div
                      key={`${label}-${itemIndex}`}
                      className="flex items-center gap-3 rounded-xl px-3 py-3"
                    >
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border/60 p-4">
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border/60 bg-background/95 px-4 backdrop-blur lg:px-6">
            <Skeleton className="h-9 w-9 rounded-xl lg:hidden" />
            <Skeleton className="h-5 w-40 rounded-full" />
            <Skeleton className="hidden h-9 flex-1 rounded-xl md:block" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </header>

          <main className="flex-1 p-6 lg:p-8">
            <div className="space-y-8">
              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 w-56" />
                <Skeleton className="h-4 w-full max-w-2xl" />
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`kpi-${index}`}
                    className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm"
                  >
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="mt-4 h-10 w-20" />
                    <Skeleton className="mt-3 h-3 w-36" />
                  </div>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
                <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
                  <Skeleton className="h-5 w-40" />
                  <div className="mt-6 space-y-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={`list-${index}`}
                        className="space-y-3 border-t border-border/50 pt-4 first:border-t-0 first:pt-0"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </div>
                          <Skeleton className="h-5 w-14 rounded-full" />
                        </div>
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
                  <Skeleton className="h-5 w-32" />
                  <div className="mt-6 space-y-4">
                    <Skeleton className="h-16 w-full rounded-2xl" />
                    <Skeleton className="h-px w-full" />
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={`message-${index}`}
                        className={index % 2 === 0 ? 'flex justify-start' : 'flex justify-end'}
                      >
                        <Skeleton className="h-10 w-3/4 rounded-2xl" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
