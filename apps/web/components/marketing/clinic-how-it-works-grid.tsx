import { BellRing, MessageCircleMore, PhoneCall, Rows3 } from 'lucide-react';
import { FadeContent } from '@/components/reactbits/fade-content';
import { clinicHowItWorksCards } from '@/lib/marketing/clinic-site';

const icons = [MessageCircleMore, PhoneCall, BellRing, Rows3] as const;

export function ClinicHowItWorksGrid() {
  return (
    <section
      id="como-funciona"
      className="border-t border-border/50 bg-[var(--marketing-bg-base)] py-24"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeContent>
          <p className="text-editorial-tiny">Como funciona</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Cuatro piezas simples para entender la recepcion completa
          </h2>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Lo que entra por WhatsApp o llamadas, lo que sale de forma proactiva y la superficie
            donde la clinica controla todo sin perder contexto.
          </p>
        </FadeContent>

        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {clinicHowItWorksCards.map((card, index) => {
            const Icon = icons[index];

            return (
              <FadeContent key={card.title} delay={index * 0.05}>
                <article className="h-full rounded-[24px] border border-border/60 bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-editorial-tiny">Operacion</p>
                    <div className="rounded-full bg-muted p-2">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight">{card.title}</h3>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">{card.description}</p>
                  <ul className="mt-6 space-y-3">
                    {card.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3 text-sm">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </FadeContent>
            );
          })}
        </div>
      </div>
    </section>
  );
}
