import { Activity, CalendarRange, Clock3, Phone, Send, Sparkles } from 'lucide-react';
import { FadeContent } from '@/components/reactbits/fade-content';
import { clinicProofPanels, clinicShowcaseCards } from '@/lib/marketing/clinic-site';

export function ClinicControlCenterShowcase() {
  return (
    <section className="border-t border-border/50 bg-[var(--marketing-bg-alt)] py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeContent>
          <p className="text-editorial-tiny">Prueba de producto</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            La promesa comercial ya se ve como producto real
          </h2>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Conversaciones, llamadas, agenda, confirmaciones, huecos y reactivación conviven como
            decisiones operativas visibles, no como una lista de features abstractas.
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
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-editorial-tiny">WhatsApp - en curso</p>
                      <h3 className="mt-2 text-lg font-semibold">Cambio de cita resuelto</h3>
                    </div>
                    <Send className="mt-1 h-5 w-5 text-primary" />
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    La recepción IA detecta un hueco antes de la cita original, propone el cambio y
                    deja lista la confirmación.
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
                      1 paciente ya respondió, 1 necesita follow-up y 1 pasa a humano.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {clinicProofPanels.map((panel) => (
                    <div
                      key={panel.title}
                      className="rounded-2xl border border-border/60 bg-card/90 p-5"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-editorial-tiny">{panel.eyebrow}</p>
                          <h3 className="mt-2 text-base font-semibold">{panel.title}</h3>
                        </div>
                        {panel.eyebrow === 'Control center' ? (
                          <Activity className="h-4 w-4 text-primary" />
                        ) : (
                          <CalendarRange className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {panel.description}
                      </p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        {panel.stats.map((stat) => (
                          <div
                            key={`${panel.title}-${stat.label}`}
                            className="rounded-xl border border-border/50 bg-muted/40 p-3"
                          >
                            <p className="text-lg font-semibold tracking-tight">{stat.value}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
                          </div>
                        ))}
                      </div>
                      <ul className="mt-5 space-y-2">
                        {panel.highlights.map((highlight) => (
                          <li key={highlight} className="flex gap-3 text-sm">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-mint" />
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
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
                    <Sparkles className="h-4 w-4 text-primary" />
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
