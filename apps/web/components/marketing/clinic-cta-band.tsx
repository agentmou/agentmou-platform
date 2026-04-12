import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { HalftoneBackground } from '@/components/brand/halftone-background';
import { FadeContent } from '@/components/reactbits/fade-content';
import { MinimalButton } from '@/components/ui/minimal-button';
import { clinicOnboardingSteps } from '@/lib/marketing/clinic-site';
import { PUBLIC_DEMO_CLINIC_HREF } from '@/lib/marketing/public-links';

export function ClinicCtaBand() {
  return (
    <section className="border-t border-border/50 bg-[var(--marketing-bg-base)] py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <HalftoneBackground
          variant="mintTop"
          intensity="high"
          className="overflow-hidden rounded-[32px] border border-border/60"
        >
          <div className="px-8 py-12 sm:px-12 sm:py-16">
            <FadeContent>
              <p className="text-editorial-tiny">CTA final</p>
              <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Una salida clara: demo, configuracion y recepcion IA activa
              </h2>
              <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
                El cierre comercial no tiene que ser ambiguo. Te ensenamos el flujo, definimos la
                configuracion y dejamos claro como arrancar con control operativo real.
              </p>
              <div className="mt-10 grid gap-4 lg:grid-cols-3">
                {clinicOnboardingSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur"
                  >
                    <p className="text-editorial-tiny">Paso {index + 1}</p>
                    <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link href="/contact-sales">
                  <MinimalButton size="xl">
                    Solicitar demo
                    <ArrowRight className="h-4 w-4" />
                  </MinimalButton>
                </Link>
                <Link href={PUBLIC_DEMO_CLINIC_HREF}>
                  <MinimalButton variant="outline" size="xl">
                    Ver demo clinic
                  </MinimalButton>
                </Link>
              </div>
            </FadeContent>
          </div>
        </HalftoneBackground>
      </div>
    </section>
  );
}
