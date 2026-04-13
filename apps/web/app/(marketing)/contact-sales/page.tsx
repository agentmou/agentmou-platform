import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, CalendarDays, MessageSquareMore, PhoneCall } from 'lucide-react';
import { HalftoneBackground } from '@/components/brand/halftone-background';
import { ContactSalesForm } from '@/components/marketing';
import { FadeContent } from '@/components/reactbits/fade-content';
import { MinimalButton } from '@/components/ui/minimal-button';
import { clinicOnboardingSteps } from '@/lib/marketing/clinic-site';
import { PUBLIC_DEMO_CLINIC_HREF } from '@/lib/marketing/public-links';

export const metadata: Metadata = {
  title: 'Solicitar demo - Agentmou Clinics',
  description:
    'Solicita una demo comercial de Agentmou Clinics para ver recepcion IA, agenda, voz, growth y control operativo.',
};

const contactSalesHighlights = [
  {
    icon: MessageSquareMore,
    title: 'Recepcion por WhatsApp',
    body: 'Ensena a tu equipo como atender conversaciones, identificar pacientes y cerrar cambios de cita sin friccion.',
  },
  {
    icon: PhoneCall,
    title: 'Voz y callbacks',
    body: 'Revisa como llamadas y devoluciones pendientes conviven con la misma bandeja y trazabilidad.',
  },
  {
    icon: CalendarDays,
    title: 'Agenda y growth',
    body: 'Mira confirmaciones, huecos recuperables, lista de espera y reactivacion en una demo aplicada a operacion dental.',
  },
];

export default function ContactSalesPage() {
  return (
    <div>
      <HalftoneBackground variant="mint" intensity="med" className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
            <FadeContent>
              <div className="max-w-2xl">
                <p className="mb-4 text-editorial-tiny">Solicitar demo</p>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  Ensenanos tu agenda y te mostramos el flujo real
                </h1>
                <p className="mt-6 text-lg text-muted-foreground">
                  Cuentanos como trabajais hoy y preparamos una demo comercial con recepcion,
                  agenda, voz o growth segun el punto donde mas valor podeis capturar.
                </p>

                <div className="mt-10 grid gap-4">
                  {contactSalesHighlights.map((item, index) => {
                    const Icon = item.icon;

                    return (
                      <FadeContent key={item.title} delay={index * 0.08}>
                        <div className="rounded-[24px] border border-border/60 bg-card p-5 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="rounded-full bg-muted p-2">
                              <Icon className="h-4 w-4" />
                            </div>
                            <p className="text-sm font-semibold">{item.title}</p>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            {item.body}
                          </p>
                        </div>
                      </FadeContent>
                    );
                  })}
                </div>

                <div className="mt-8 rounded-[24px] border border-border/60 bg-[var(--marketing-bg-alt)] p-6">
                  <p className="text-sm font-semibold">Que pasa despues de enviar el formulario?</p>
                  <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                    {clinicOnboardingSteps.map((step, index) => (
                      <li key={step.title} className="flex gap-3">
                        <span className="font-semibold text-foreground">{index + 1}.</span>
                        <span>
                          <span className="font-medium text-foreground">{step.title}:</span>{' '}
                          {step.description}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </FadeContent>

            <FadeContent delay={0.1}>
              <div className="rounded-[32px] border border-border/60 bg-[color-mix(in_srgb,var(--background)_80%,white)] p-3 shadow-[0_30px_80px_rgba(17,24,39,0.12)]">
                <ContactSalesForm />
              </div>
            </FadeContent>
          </div>
        </div>
      </HalftoneBackground>

      <section className="border-t border-border/50 bg-[var(--marketing-bg-base)] py-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <p className="text-lg font-semibold">
              Prefieres revisar primero pricing, seguridad o la demo clinic?
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Puedes volver a la home, revisar seguridad o abrir la demo clinic sin salir del
              recorrido comercial.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/pricing">
              <MinimalButton variant="outline">
                Ver pricing
                <ArrowRight className="h-4 w-4" />
              </MinimalButton>
            </Link>
            <Link href={PUBLIC_DEMO_CLINIC_HREF}>
              <MinimalButton variant="outline">Ver demo clinic</MinimalButton>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
