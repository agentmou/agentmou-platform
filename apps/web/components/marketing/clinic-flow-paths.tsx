import { ArrowRight, ClipboardList, UserRoundCheck } from 'lucide-react';
import { FadeContent } from '@/components/reactbits/fade-content';
import { clinicFlowPaths } from '@/lib/marketing/clinic-site';

const pathIcons = [UserRoundCheck, ClipboardList] as const;

export function ClinicFlowPaths() {
  return (
    <section id="como-funciona" className="border-t border-border/50 bg-[var(--marketing-bg-base)] py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeContent>
          <p className="text-editorial-tiny">Nuevo vs existente</p>
          <h2 id="flujo-clinico" className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Una recepcion que entiende a quien tiene delante
          </h2>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            La experiencia cambia segun si la clinica ya conoce al paciente o si hace
            falta abrir ficha, pedir datos y asegurar que no falta informacion.
          </p>
        </FadeContent>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {clinicFlowPaths.map((path, index) => {
            const Icon = pathIcons[index];
            return (
              <FadeContent key={path.title} delay={index * 0.08}>
                <article className={`h-full rounded-[28px] border border-border/60 p-8 shadow-sm ${path.accent}`}>
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-2xl font-semibold tracking-tight">{path.title}</h3>
                    <div className="rounded-full bg-card p-3 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
                    {path.description}
                  </p>
                  <div className="mt-8 space-y-4">
                    {path.steps.map((step, stepIndex) => (
                      <div key={step} className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/80 p-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                          {stepIndex + 1}
                        </div>
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="text-sm font-medium">{step}</span>
                          {stepIndex < path.steps.length - 1 ? (
                            <ArrowRight className="hidden h-4 w-4 text-muted-foreground md:block" />
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              </FadeContent>
            );
          })}
        </div>
      </div>
    </section>
  );
}
