import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { HalftoneBackground } from '@/components/brand/halftone-background';
import { MinimalButton } from '@/components/ui/minimal-button';
import { FadeContent } from '@/components/reactbits/fade-content';

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
                Menos huecos vacios. Menos recepcion saturada. Mas control operativo.
              </h2>
              <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
                Si quieres ver la recepcion IA funcionando sobre WhatsApp, llamadas, agenda y
                seguimiento real, te ensenamos el flujo con tu contexto.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link href="/contact-sales">
                  <MinimalButton size="xl">
                    Solicitar demo
                    <ArrowRight className="h-4 w-4" />
                  </MinimalButton>
                </Link>
                <Link href="/pricing">
                  <MinimalButton variant="outline" size="xl">
                    Ver pricing
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
