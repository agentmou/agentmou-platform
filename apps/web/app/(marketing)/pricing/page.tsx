import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Check } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { MinimalButton } from '@/components/ui/minimal-button';
import { HalftoneBackground } from '@/components/brand/halftone-background';
import { FadeContent } from '@/components/reactbits/fade-content';
import { TiltedCard } from '@/components/reactbits/tilted-card';
import { clinicPricingPlans } from '@/lib/marketing/clinic-site';

export const metadata: Metadata = {
  title: 'Pricing - Agentmou Clinics',
  description:
    'Packaging clinico por modulos para recepcion, voz, growth y despliegues enterprise.',
};

const comparisonRows = [
  {
    label: 'Core Reception',
    values: ['Incluido', 'Incluido', 'Incluido', 'Incluido'],
  },
  {
    label: 'Voice',
    values: ['Opcional', 'Incluido', 'Opcional', 'Incluido'],
  },
  {
    label: 'Growth',
    values: ['Opcional', 'Opcional', 'Incluido', 'Incluido'],
  },
  {
    label: 'Canales',
    values: ['WhatsApp', 'WhatsApp + voz', 'WhatsApp + growth', 'Multicanal'],
  },
  {
    label: 'Cobertura operativa',
    values: [
      'Recepcion y agenda',
      'Recepcion + llamadas',
      'Recepcion + recuperacion',
      'Sedes y flujos complejos',
    ],
  },
  {
    label: 'Despliegue',
    values: ['Guiado', 'Guiado', 'Guiado', 'Acompanamiento dedicado'],
  },
];

const faqs = [
  {
    question: 'Como elijo entre Reception, Voice y Growth?',
    answer:
      'Reception suele ser el punto de entrada para ordenar WhatsApp, agenda, formularios y confirmaciones. Voice entra cuando el telefono sigue cargando primeras visitas y callbacks. Growth entra cuando la clinica ya atiende bien y quiere recuperar huecos, recalls y pacientes inactivos.',
  },
  {
    question: 'Puedo empezar por una base y ampliar despues?',
    answer:
      'Si. La activacion esta pensada para avanzar por fases. Puedes empezar con Reception y sumar Voice o Growth cuando el equipo ya tenga visibilidad y criterio sobre el siguiente cuello de botella.',
  },
  {
    question: 'Que parte requiere configuracion guiada?',
    answer:
      'Siempre acompanamos el arranque para ajustar canales, handoff humano, reglas de agenda y el modulo que mas valor puede capturar primero. La idea no es venderte un builder tecnico, sino una operacion que empiece bien.',
  },
  {
    question: 'Voice y Growth son obligatorios?',
    answer:
      'No. Son modulos opcionales. Voice suma llamadas y callbacks. Growth suma huecos liberados, lista de espera y reactivacion.',
  },
  {
    question: 'Que incluye Enterprise?',
    answer:
      'Permisos ampliados, despliegues con varias sedes, configuracion avanzada y acompanamiento para operaciones mas complejas.',
  },
];

export default function PricingPage() {
  return (
    <div>
      <HalftoneBackground variant="mint" intensity="med" className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeContent>
            <div className="text-center">
              <p className="mb-4 text-editorial-tiny">Pricing</p>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Packaging claro para recepcion, voz y crecimiento
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-muted-foreground">
                La clinica compra modulos utiles para operacion real: recepcion multicanal,
                llamadas, seguimiento, huecos y reactivacion. Sin runs visibles ni FAQs tecnicas
                sobre el motor interno.
              </p>
            </div>
          </FadeContent>
        </div>
      </HalftoneBackground>

      <div className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
        <div className="mt-20 grid gap-8 lg:grid-cols-4">
          {clinicPricingPlans.map((plan, index) => (
            <FadeContent key={plan.name} delay={index * 0.06}>
              <TiltedCard className="h-full">
                <div
                  className={`relative h-full rounded-[26px] border bg-card ${
                    plan.highlight ? 'border-foreground' : 'border-border/50'
                  }`}
                >
                  <div className="p-8">
                    {plan.highlight ? (
                      <div className="absolute -top-3 left-6">
                        <span className="bg-foreground px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-background">
                          Mas habitual
                        </span>
                      </div>
                    ) : null}

                    <div className="mb-6">
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{plan.subtitle}</p>
                    </div>

                    <div className="mb-4">
                      <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                    </div>

                    <div className="mb-8 flex flex-wrap gap-2">
                      {plan.modules.map((module) => (
                        <span
                          key={`${plan.name}-${module}`}
                          className="rounded-full bg-muted px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
                        >
                          {module}
                        </span>
                      ))}
                    </div>

                    <div className="mb-8 rounded-2xl border border-border/60 bg-muted/40 p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        Para quien encaja
                      </p>
                      <p className="mt-2 text-sm font-medium">{plan.bestFor}</p>
                    </div>

                    <ul className="mb-8 space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link href="/contact-sales" className="block">
                      <MinimalButton
                        className="w-full"
                        variant={plan.highlight ? 'default' : 'outline'}
                      >
                        {plan.ctaLabel}
                      </MinimalButton>
                    </Link>
                  </div>
                </div>
              </TiltedCard>
            </FadeContent>
          ))}
        </div>

        <FadeContent>
          <div className="mt-32">
            <h2 className="mb-12 text-center text-2xl font-bold tracking-tight">
              Comparativa rapida
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="py-4 text-left text-editorial-tiny">Capacidad</th>
                    <th className="py-4 text-center text-editorial-tiny">Reception</th>
                    <th className="py-4 text-center text-editorial-tiny">Reception + Voice</th>
                    <th className="py-4 text-center text-editorial-tiny">Reception + Growth</th>
                    <th className="py-4 text-center text-editorial-tiny">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.label} className="border-b border-border/30">
                      <td className="py-4 text-sm font-medium">{row.label}</td>
                      {row.values.map((value) => (
                        <td
                          key={`${row.label}-${value}`}
                          className="py-4 text-center text-sm text-muted-foreground"
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </FadeContent>

        <FadeContent>
          <div className="mt-32">
            <h2 className="mb-12 text-center text-2xl font-bold tracking-tight">
              Preguntas frecuentes
            </h2>
            <div className="mx-auto max-w-3xl">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem
                    key={faq.question}
                    value={`item-${index}`}
                    className="border-border/50"
                  >
                    <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </FadeContent>

        <FadeContent>
          <div className="mt-32 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">
              Quieres ver el packaging aplicado a tu clinica?
            </h2>
            <p className="mb-8 text-muted-foreground">
              Te ensenamos que combinacion de modulos encaja con tus canales, agenda, volumen
              operativo y momento de madurez.
            </p>
            <Link href="/contact-sales">
              <MinimalButton size="lg">
                Solicitar demo
                <ArrowRight className="h-4 w-4" />
              </MinimalButton>
            </Link>
          </div>
        </FadeContent>
      </div>
    </div>
  );
}
