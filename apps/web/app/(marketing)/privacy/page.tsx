import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { HalftoneBackground } from '@/components/brand/halftone-background';
import { FadeContent } from '@/components/reactbits/fade-content';
import { MinimalButton } from '@/components/ui/minimal-button';

export const metadata: Metadata = {
  title: 'Privacidad | Agentmou Clinics',
  description:
    'Política de privacidad inicial de Agentmou Clinics para la web pública, solicitudes de demo y comunicaciones comerciales.',
  alternates: {
    canonical: '/privacy',
  },
};

const sections = [
  {
    title: 'Qué cubre esta página',
    body: 'Esta política aplica a la web pública de Agentmou Clinics, a las solicitudes de demo y a las conversaciones comerciales iniciadas desde este sitio. No sustituye todavía a un acuerdo legal específico de cliente para despliegues productivos.',
  },
  {
    title: 'Qué datos podemos recoger',
    body: 'Podemos recoger datos de contacto que nos envíes en formularios comerciales, información básica de navegación necesaria para operar la web y contexto de conversación cuando nos escribes para solicitar una demo o resolver dudas sobre el producto.',
  },
  {
    title: 'Para qué usamos la información',
    body: 'Usamos esa información para responder solicitudes, preparar demos, mejorar la experiencia comercial del sitio, mantener la seguridad operativa y gestionar el seguimiento comercial cuando existe interés legítimo en continuar la conversación.',
  },
  {
    title: 'Cómo tratamos y compartimos los datos',
    body: 'Limitamos el acceso a los equipos y proveedores que necesitan intervenir para operar la web, coordinar demos o mantener la infraestructura. No vendemos datos personales ni usamos la información pública del sitio para fines ajenos a la operación comercial y técnica de Agentmou.',
  },
  {
    title: 'Conservación y derechos',
    body: 'Conservamos los datos comerciales durante el tiempo razonable para atender tu solicitud, mantener trazabilidad básica y cumplir obligaciones operativas. Puedes pedir acceso, corrección o eliminación escribiendo a nuestro equipo de contacto.',
  },
] as const;

export default function PrivacyPage() {
  return (
    <div>
      <HalftoneBackground variant="mint" intensity="med" className="pt-24 pb-16">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <FadeContent>
            <div className="max-w-3xl">
              <p className="text-editorial-tiny">Privacidad</p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                Una base clara y honesta sobre cómo tratamos los datos en la web pública
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Esta política está pensada para ser publicable desde hoy. La revisaremos con apoyo
                legal formal antes de cerrar la versión contractual definitiva para clientes y
                despliegues productivos.
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
              <h2 className="text-2xl font-semibold tracking-tight">Contacto</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Si necesitas revisar esta política o ejercer una solicitud relacionada con tus
                datos, puedes escribirnos a través de la página de contacto comercial y lo
                canalizaremos con el equipo adecuado.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/contact-sales">
                  <MinimalButton>
                    Solicitar contacto
                    <ArrowRight className="h-4 w-4" />
                  </MinimalButton>
                </Link>
                <Link href="/security">
                  <MinimalButton variant="outline">Ver seguridad</MinimalButton>
                </Link>
              </div>
            </div>
          </FadeContent>
        </div>
      </section>
    </div>
  );
}
