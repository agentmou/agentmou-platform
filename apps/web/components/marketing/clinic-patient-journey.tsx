import { ArrowRight } from 'lucide-react';
import { FadeContent } from '@/components/reactbits/fade-content';
import { clinicPatientJourney } from '@/lib/marketing/clinic-site';

export function ClinicPatientJourney() {
  return (
    <section
      id="flujo-clinico"
      className="border-t border-border/50 bg-[var(--marketing-bg-alt)] py-24"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <FadeContent>
            <div className="rounded-[28px] border border-border/60 bg-card p-8 shadow-sm">
              <p className="text-editorial-tiny">Journey de paciente nuevo</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight">
                {clinicPatientJourney.title}
              </h2>
              <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
                {clinicPatientJourney.description}
              </p>

              <div className="mt-10 space-y-4">
                {clinicPatientJourney.steps.map((step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-4 rounded-2xl border border-border/60 bg-[var(--marketing-bg-alt)] p-4"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {index + 1}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{step}</span>
                      {index < clinicPatientJourney.steps.length - 1 ? (
                        <ArrowRight className="hidden h-4 w-4 text-muted-foreground md:block" />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeContent>

          <FadeContent delay={0.08}>
            <div className="rounded-[28px] border border-border/60 bg-card p-8 shadow-sm">
              <p className="text-editorial-tiny">¿Qué ve la clínica?</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight">
                Automatización con resultado operativo visible
              </h3>
              <div className="mt-8 grid gap-4">
                {clinicPatientJourney.outcomes.map((outcome) => (
                  <div
                    key={outcome.label}
                    className="rounded-2xl border border-border/60 bg-[var(--marketing-bg-base)] p-5"
                  >
                    <p className="text-sm font-semibold">{outcome.label}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{outcome.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeContent>
        </div>
      </div>
    </section>
  );
}
