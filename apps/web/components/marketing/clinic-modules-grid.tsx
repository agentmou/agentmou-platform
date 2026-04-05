import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { FadeContent } from '@/components/reactbits/fade-content';
import { Badge } from '@/components/ui/badge';
import { MinimalButton } from '@/components/ui/minimal-button';
import { clinicModules } from '@/lib/marketing/clinic-site';

export function ClinicModulesGrid() {
  return (
    <section id="modulos" className="border-t border-border/50 bg-[var(--marketing-bg-base)] py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeContent>
          <p className="text-editorial-tiny">Modulos</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Packaging claro para operacion real
          </h2>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            La clinica entiende que compra: recepcion base, voz, crecimiento y
            necesidades enterprise. Nada de runs, packs ni complejidad tecnica.
          </p>
        </FadeContent>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {clinicModules.map((module, index) => (
            <FadeContent key={module.name} delay={index * 0.08}>
              <article
                className={`rounded-[26px] border p-7 shadow-sm ${
                  module.highlight
                    ? 'border-foreground bg-[color-mix(in_srgb,var(--accent)_10%,white)]'
                    : 'border-border/60 bg-card'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-editorial-tiny">{module.eyebrow}</p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight">{module.name}</h3>
                  </div>
                  {module.highlight ? <Badge>Base recomendada</Badge> : null}
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {module.description}
                </p>
                <ul className="mt-6 space-y-3">
                  {module.capabilities.map((capability) => (
                    <li key={capability} className="flex items-start gap-3 text-sm">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <span>{capability}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </FadeContent>
          ))}
        </div>

        <FadeContent delay={0.1}>
          <div className="mt-12 flex flex-col gap-4 rounded-[24px] border border-border/60 bg-[var(--marketing-bg-alt)] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold">Quieres ver que combinacion encaja con tu clinica?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Te ayudamos a definir si el punto de partida es Reception, Voice, Growth
                o una configuracion enterprise.
              </p>
            </div>
            <Link href="/contact-sales">
              <MinimalButton>
                Solicitar demo
                <ArrowRight className="h-4 w-4" />
              </MinimalButton>
            </Link>
          </div>
        </FadeContent>
      </div>
    </section>
  );
}
