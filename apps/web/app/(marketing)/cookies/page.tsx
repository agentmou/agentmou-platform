import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { HalftoneBackground } from '@/components/brand/halftone-background';
import { FadeContent } from '@/components/reactbits/fade-content';
import { MinimalButton } from '@/components/ui/minimal-button';

export const metadata: Metadata = {
  title: 'Cookies | Agentmou Clinics',
  description:
    'Política de cookies de la web pública de Agentmou Clinics: cookies necesarias y analítica opcional.',
  alternates: {
    canonical: '/cookies',
  },
};

const sections = [
  {
    title: 'Qué cookies usamos ahora',
    body: 'La web pública usa cookies necesarias para recordar decisiones básicas de experiencia y operar correctamente. Si aceptas analítica, activamos además medición de uso para entender qué páginas y mensajes funcionan mejor.',
  },
  {
    title: 'Cookies necesarias',
    body: 'Estas cookies permiten que el sitio cargue y mantenga funciones básicas que el usuario espera. No se pueden desactivar desde el banner porque son parte del funcionamiento normal de la web.',
  },
  {
    title: 'Cookies de analítica',
    body: 'Solo se activan si aceptas analítica desde el banner. Las usamos para medir visitas, recorridos y puntos de interés comercial en la web pública, y así mejorar la experiencia de marketing.',
  },
  {
    title: 'Cómo gestionar tu decisión',
    body: 'Puedes aceptar o rechazar la analítica desde el banner cuando visites la web pública. Si más adelante necesitamos una gestión más granular, ampliaremos esta página y el mecanismo de control.',
  },
] as const;

export default function CookiesPage() {
  return (
    <div>
      <HalftoneBackground variant="mint" intensity="med" className="pt-24 pb-16">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <FadeContent>
            <div className="max-w-3xl">
              <p className="text-editorial-tiny">Cookies</p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                Cómo usamos cookies en la web pública de Agentmou
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Esta política cubre la parte pública del sitio. La app operativa mantiene sus
                propias cookies necesarias de autenticación fuera de este banner.
              </p>
            </div>
          </FadeContent>
        </div>
      </HalftoneBackground>

      <section className="border-t border-border/50 bg-[var(--marketing-bg-base)] py-20">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="grid gap-6">
            {sections.map((section, index) => (
              <FadeContent key={section.title} delay={index * 0.04}>
                <article className="rounded-[28px] border border-border/60 bg-card p-8 shadow-sm">
                  <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{section.body}</p>
                </article>
              </FadeContent>
            ))}
          </div>

          <FadeContent delay={0.15}>
            <div className="mt-10 rounded-[28px] border border-border/60 bg-[var(--marketing-bg-alt)] p-8">
              <h2 className="text-2xl font-semibold tracking-tight">
                Siguiente lectura recomendada
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Si quieres revisar el tratamiento general de datos y las condiciones del sitio,
                puedes continuar con privacidad y términos.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/privacy">
                  <MinimalButton>
                    Ver privacidad
                    <ArrowRight className="h-4 w-4" />
                  </MinimalButton>
                </Link>
                <Link href="/terms">
                  <MinimalButton variant="outline">Ver términos</MinimalButton>
                </Link>
              </div>
            </div>
          </FadeContent>
        </div>
      </section>
    </div>
  );
}
