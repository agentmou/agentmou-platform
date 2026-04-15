import { FadeContent } from '@/components/reactbits/fade-content';
import { clinicCostOfInactionMetrics } from '@/lib/marketing/clinic-site';

export function ClinicCostOfInaction() {
  return (
    <section className="border-t border-border/50 bg-[var(--marketing-bg-alt)] py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeContent>
          <div className="max-w-3xl">
            <p className="text-editorial-tiny">Coste real de no actuar</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Lo que hoy se pierde ya es suficientemente visible como para medirlo
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              La oportunidad no solo está en automatizar. Está en dejar de perder llamadas, citas y
              huecos que la clínica ya había conseguido.
            </p>
          </div>
        </FadeContent>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {clinicCostOfInactionMetrics.map((metric, index) => (
            <FadeContent key={metric.label} delay={index * 0.08}>
              <article className="rounded-[26px] border border-border/60 bg-card p-7 shadow-sm">
                <p className="text-4xl font-semibold tracking-tight">{metric.value}</p>
                <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {metric.label}
                </p>
                <p className="mt-5 text-sm leading-6 text-muted-foreground">{metric.explanation}</p>
              </article>
            </FadeContent>
          ))}
        </div>
      </div>
    </section>
  );
}
