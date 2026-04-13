import { CalendarX2, MessageCircleOff, PhoneMissed } from 'lucide-react';
import { FadeContent } from '@/components/reactbits/fade-content';
import { clinicPainPoints } from '@/lib/marketing/clinic-site';

const icons = [PhoneMissed, MessageCircleOff, CalendarX2] as const;

export function ClinicPainSection() {
  return (
    <section className="border-t border-border/50 bg-[var(--marketing-bg-base)] py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeContent>
          <p className="text-editorial-tiny">Dolor operativo</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            La recepcion pierde ingresos antes de que la agenda llegue a moverse
          </h2>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            No es un problema de software abstracto. Es demanda real que se enfria mientras el
            equipo atiende mostrador, silla, telefono y WhatsApp al mismo tiempo.
          </p>
        </FadeContent>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {clinicPainPoints.map((pain, index) => {
            const Icon = icons[index];

            return (
              <FadeContent key={pain.title} delay={index * 0.08}>
                <article className="rounded-[26px] border border-border/60 bg-card p-7 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-editorial-tiny">Pain point</p>
                      <h3 className="mt-3 text-2xl font-semibold tracking-tight">{pain.title}</h3>
                    </div>
                    <div className="rounded-full bg-muted p-3">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-6 text-muted-foreground">{pain.description}</p>
                  <div className="mt-6 rounded-2xl border border-border/60 bg-[var(--marketing-bg-alt)] p-4">
                    <p className="text-sm font-medium">{pain.impact}</p>
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
