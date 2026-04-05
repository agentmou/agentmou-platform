import { Clock3, Phone, Send, Sparkles } from 'lucide-react';
import { FadeContent } from '@/components/reactbits/fade-content';
import { clinicShowcaseCards } from '@/lib/marketing/clinic-site';

export function ClinicControlCenterShowcase() {
  return (
    <section className="border-t border-border/50 bg-[var(--marketing-bg-alt)] py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeContent>
          <p className="text-editorial-tiny">Centro de recepcion</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Todo lo operativo, en una sola vista
          </h2>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Conversaciones, llamadas, agenda, confirmaciones, huecos y reactivacion
            conviven como decisiones de recepcion, no como modulos sueltos.
          </p>
        </FadeContent>

        <div className="mt-14 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <FadeContent>
            <div className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-3 border-b border-border/50 pb-5">
                <span className="rounded-full bg-primary px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-primary-foreground">
                  Bandeja priorizada
                </span>
                <span className="rounded-full bg-muted px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Hoy
                </span>
              </div>

              <div className="mt-6 grid gap-4">
                <div className="rounded-2xl border border-border/60 bg-[color-mix(in_srgb,var(--accent)_12%,white)] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-editorial-tiny">WhatsApp - en curso</p>
                      <h3 className="mt-2 text-lg font-semibold">Cambio de cita resuelto</h3>
                    </div>
                    <Send className="mt-1 h-5 w-5 text-accent-foreground" />
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    La recepcion IA detecta un hueco antes de la cita original, propone el
                    cambio y deja lista la confirmacion.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-muted/40 p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-editorial-tiny">Llamada</p>
                      <Phone className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-medium">Callback pendiente 17:30</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Primera visita - implantes - dejar presupuesto y disponibilidad.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/40 p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-editorial-tiny">Confirmaciones</p>
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-medium">3 pendientes antes de las 14:00</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      1 paciente ya respondio, 1 necesita follow-up, 1 pasa a humano.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </FadeContent>

          <div className="grid gap-4">
            {clinicShowcaseCards.map((card, index) => (
              <FadeContent key={card.title} delay={index * 0.05}>
                <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-editorial-tiny">{card.badge}</p>
                      <h3 className="mt-2 text-base font-semibold">{card.title}</h3>
                    </div>
                    <Sparkles className="h-4 w-4 text-accent" />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{card.body}</p>
                  <p className="mt-4 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    {card.detail}
                  </p>
                </div>
              </FadeContent>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
