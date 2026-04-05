import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { HalftoneBackground } from '@/components/brand/halftone-background';
import { FadeContent } from '@/components/reactbits/fade-content';
import { MinimalButton } from '@/components/ui/minimal-button';
import { PlatformEngineGrid } from '@/components/marketing';
import { buildMarketingFeaturedCatalog } from '@/lib/marketing/featured-from-demo';

export const metadata: Metadata = {
  title: 'Platform - Agentmou Clinics',
  description:
    'Narrativa tecnica secundaria del engine de Agentmou: orchestration, approvals, observability, control plane, catalogo y n8n.',
};

export default function PlatformPage() {
  const featuredCatalog = buildMarketingFeaturedCatalog();

  return (
    <div>
      <HalftoneBackground variant="mint" intensity="med" className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeContent>
            <div className="max-w-3xl">
              <p className="mb-4 text-editorial-tiny">Plataforma</p>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                El engine sigue siendo potente, solo que ya no lidera la portada
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                La propuesta visible es una recepcion IA para clinicas. Detras de esa experiencia
                siguen vivos el control plane, approvals, observability, catalogo operativo y n8n
                como capa de orquestacion.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link href="/contact-sales">
                  <MinimalButton size="lg">
                    Solicitar demo
                    <ArrowRight className="h-4 w-4" />
                  </MinimalButton>
                </Link>
                <Link href="/app/demo-workspace/dashboard">
                  <MinimalButton variant="outline" size="lg">
                    Ver demo clinic
                  </MinimalButton>
                </Link>
              </div>
            </div>
          </FadeContent>
        </div>
      </HalftoneBackground>

      <PlatformEngineGrid featuredCatalog={featuredCatalog} />
    </div>
  );
}
