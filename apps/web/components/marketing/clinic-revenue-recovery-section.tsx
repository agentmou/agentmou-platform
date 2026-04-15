import { FadeContent } from '@/components/reactbits/fade-content';
import { clinicRecoveryCapabilities } from '@/lib/marketing/clinic-site';

export function ClinicRevenueRecoverySection() {
  return (
    <section className="border-t border-border/50 bg-[var(--marketing-bg-base)] py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeContent>
          <p className="text-editorial-tiny">Agenda más llena</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Menos ingresos perdidos, más agenda sana
          </h2>
          <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
            Confirmaciones, huecos, reactivación y formularios no se presentan como features
            sueltas. Funcionan como una capa de recuperación continua sobre la agenda real.
          </p>
        </FadeContent>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {clinicRecoveryCapabilities.map((capability, index) => (
            <FadeContent key={capability.title} delay={index * 0.05}>
              <article className="rounded-[24px] border border-border/60 bg-card p-6 shadow-sm">
                <p className="text-editorial-tiny">Recuperación</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight">{capability.title}</h3>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {capability.description}
                </p>
                <div className="mt-6 rounded-2xl border border-border/60 bg-[var(--marketing-bg-alt)] p-4">
                  <p className="text-sm font-medium">{capability.outcome}</p>
                </div>
              </article>
            </FadeContent>
          ))}
        </div>
      </div>
    </section>
  );
}
