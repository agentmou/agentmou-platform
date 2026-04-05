import type { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HalftoneBackground } from '@/components/brand/halftone-background';
import { FadeContent } from '@/components/reactbits/fade-content';
import { SpotlightCard } from '@/components/reactbits/spotlight-card';
import { TiltedCard } from '@/components/reactbits/tilted-card';
import { ClinicCtaBand } from '@/components/marketing';
import { clinicSecurityPillars } from '@/lib/marketing/clinic-site';
import {
  Eye,
  KeyRound,
  Lock,
  Shield,
  ShieldCheck,
  Stethoscope,
  Workflow,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Security - Agentmou Clinics',
  description:
    'Privacidad por clinica, permisos, trazabilidad, revision humana y canales protegidos para una recepcion IA multicanal.',
};

const capabilityCards = [
  {
    icon: Shield,
    title: 'Privacidad por clinica',
    description:
      'Cada tenant opera con aislamiento multi-tenant, canales propios y control de acceso acotado al contexto de su clinica.',
  },
  {
    icon: Eye,
    title: 'Trazabilidad visible',
    description:
      'Mensajes, llamadas, confirmaciones, cambios y revisiones humanas quedan registrados para soporte, auditoria y mejora continua.',
  },
  {
    icon: Workflow,
    title: 'Revision humana cuando importa',
    description:
      'La recepcion IA no fuerza automatizacion ciega. Los casos sensibles, callbacks y excepciones pueden pasar a humano con contexto.',
  },
  {
    icon: KeyRound,
    title: 'Integraciones seguras',
    description:
      'Canales e integraciones operan con credenciales protegidas y configuracion controlada por tenant.',
  },
];

const operatingPractices = [
  {
    title: 'Control operativo',
    items: [
      'Permisos por rol y visibilidad por tenant',
      'Modo interno separado de la experiencia clinica',
      'Fallback visible cuando una automatizacion no puede cerrar sola',
    ],
  },
  {
    title: 'Proteccion de canales',
    items: [
      'Canales de WhatsApp y voz con estado y trazabilidad',
      'Webhooks con validacion de provider e idempotencia',
      'Eventos inbound y outbound auditables',
    ],
  },
  {
    title: 'Seguridad de plataforma',
    items: [
      'Aislamiento multi-tenant para datos y operaciones',
      'Control plane y worker separados de la shell publica',
      'Integraciones y callbacks con configuracion segura',
    ],
  },
];

export default function SecurityPage() {
  return (
    <div>
      <HalftoneBackground variant="mint" intensity="med" className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeContent>
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="mb-6">
                Seguridad para recepcion clinica
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Confianza, control y trazabilidad para cada clinica
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Agentmou Clinics protege la operacion de recepcion con permisos,
                aislamiento por tenant, revision humana y canales seguros sin
                convertir la pagina en un pitch de buyer DevOps.
              </p>
            </div>
          </FadeContent>
        </div>
      </HalftoneBackground>

      <div className="py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeContent>
            <div id="aislamiento" className="mt-24">
              <h2 className="text-center text-2xl font-bold">
                Lo que ve la clinica y lo que protege el sistema
              </h2>
              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {capabilityCards.map((capability, index) => {
                  const Icon = capability.icon;

                  return (
                    <FadeContent key={capability.title} delay={index * 0.05}>
                    <TiltedCard className="h-full">
                      <SpotlightCard className="h-full rounded-md border border-border/50 bg-card">
                        <Card className="h-full border-0 bg-transparent py-0 shadow-none">
                          <CardHeader className="gap-4 border-b border-border/50 pb-6">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-editorial-tiny">Seguridad</p>
                              <div className="rounded-lg bg-muted p-2">
                                <Icon className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </div>
                            <CardTitle className="text-base">{capability.title}</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-6">
                            <p className="text-sm leading-6 text-muted-foreground">
                              {capability.description}
                            </p>
                          </CardContent>
                        </Card>
                      </SpotlightCard>
                    </TiltedCard>
                    </FadeContent>
                  );
                })}
              </div>
            </div>
          </FadeContent>

          <FadeContent>
            <div id="control" className="mt-24 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[28px] border border-border/60 bg-card p-8 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-muted p-3">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold">Pilares de seguridad clinica</h2>
                </div>
                <div className="mt-8 grid gap-4">
                  {clinicSecurityPillars.map((pillar) => (
                    <div
                      key={pillar.title}
                      className="rounded-2xl border border-border/60 bg-muted/30 p-5"
                    >
                      <p className="text-sm font-semibold">{pillar.title}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {pillar.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-6">
                {operatingPractices.map((practice) => (
                  <div
                    key={practice.title}
                    className="rounded-[24px] border border-border/60 bg-card p-6 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-muted p-2">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <h3 className="text-lg font-semibold">{practice.title}</h3>
                    </div>
                    <ul className="mt-5 space-y-3">
                      {practice.items.map((item) => (
                        <li key={item} className="flex items-start gap-3">
                          <div className="mt-2 h-1.5 w-1.5 rounded-full bg-foreground" />
                          <span className="text-sm text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <div className="rounded-[24px] border border-border/60 bg-muted/50 p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-card p-2">
                      <Lock className="h-4 w-4" />
                    </div>
                    <h3 className="text-lg font-semibold">
                      Necesitas revisar algo con el equipo?
                    </h3>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    Podemos compartir el framing de seguridad, despliegue y control
                    operativo durante la demo comercial.
                  </p>
                </div>
              </div>
            </div>
          </FadeContent>
        </div>
      </div>

      <ClinicCtaBand />
    </div>
  );
}
