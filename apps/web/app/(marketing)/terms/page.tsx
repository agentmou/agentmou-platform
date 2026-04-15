import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { HalftoneBackground } from '@/components/brand/halftone-background';
import { FadeContent } from '@/components/reactbits/fade-content';
import { MinimalButton } from '@/components/ui/minimal-button';

export const metadata: Metadata = {
  title: 'Términos | Agentmou Clinics',
  description:
    'Términos iniciales de uso de la web pública de Agentmou Clinics, solicitudes de demo y materiales comerciales.',
  alternates: {
    canonical: '/terms',
  },
};

const sections = [
  {
    title: 'Objeto del sitio',
    body: 'La web pública de Agentmou Clinics tiene fines informativos y comerciales. Sirve para explicar la propuesta del producto, solicitar demos y abrir conversaciones de evaluación con potenciales clientes.',
  },
  {
    title: 'Uso razonable',
    body: 'Esperamos un uso legítimo del sitio y de sus formularios. No debes utilizar la web para interferir con la operación, enviar contenido fraudulento o intentar acceder a superficies internas no destinadas al recorrido público.',
  },
  {
    title: 'Demos y materiales comerciales',
    body: 'Las demos, ejemplos y materiales públicos muestran un framing comercial del producto. No constituyen por sí solos una promesa contractual de disponibilidad, rendimiento o alcance funcional para un despliegue concreto.',
  },
  {
    title: 'Sin asesoramiento médico',
    body: 'Nada en esta web constituye consejo médico ni sustituye la valoración profesional de una clínica. Agentmou Clinics se presenta aquí como software y operación asistida para recepción clínica.',
  },
  {
    title: 'Cambios y revisión formal',
    body: 'Podemos ajustar estos términos a medida que madure el despliegue comercial y la revisión legal formal. Si ese cambio afecta de forma material al uso de esta web, actualizaremos esta página.',
  },
] as const;

export default function TermsPage() {
  return (
    <div>
      <HalftoneBackground variant="mint" intensity="med" className="pt-24 pb-16">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <FadeContent>
            <div className="max-w-3xl">
              <p className="text-editorial-tiny">Términos</p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                Términos iniciales para el uso del sitio público
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Este texto busca ser suficiente para publicar con honestidad hoy, sin fingir una
                revisión legal cerrada que todavía no hemos completado de forma externa.
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
              <h2 className="text-2xl font-semibold tracking-tight">Siguiente paso razonable</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Si necesitas validar encaje, seguridad o alcance antes de avanzar, lo adecuado es
                revisar una demo comercial o la página de seguridad en lugar de inferir garantías
                desde una página pública aislada.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/contact-sales">
                  <MinimalButton>
                    Solicitar demo
                    <ArrowRight className="h-4 w-4" />
                  </MinimalButton>
                </Link>
                <Link href="/privacy">
                  <MinimalButton variant="outline">Ver privacidad</MinimalButton>
                </Link>
              </div>
            </div>
          </FadeContent>
        </div>
      </section>
    </div>
  );
}
