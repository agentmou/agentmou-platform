import Link from 'next/link';
import { ArrowRight, CalendarDays, MessageCircleMore, PhoneCall } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MinimalButton } from '@/components/ui/minimal-button';
import { FadeContent } from '@/components/reactbits/fade-content';
import { GradientText } from '@/components/reactbits/gradient-text';
import { Threads } from '@/components/reactbits/threads';
import { clinicMarketingStats } from '@/lib/marketing/clinic-site';

export function MarketingHeroClinic() {
  return (
    <section className="relative min-h-[92vh] overflow-hidden bg-[var(--marketing-bg-base)]">
      <div className="absolute inset-0" aria-hidden>
        <Threads color={[0, 0.788, 0.988]} distance={0.7} amplitude={0.55} className="absolute inset-0" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-16 px-6 pb-24 pt-28 lg:flex-row lg:items-end lg:gap-12 lg:px-8 lg:pb-28 lg:pt-32">
        <div className="max-w-3xl">
          <FadeContent duration={0.45}>
            <Badge variant="secondary" className="mb-6 rounded-full px-3 py-1">
              Recepcion IA multicanal para clinicas dentales
            </Badge>

            <h1 className="text-editorial-headline max-w-4xl">
              <GradientText className="block">Tu recepcionista IA</GradientText>
              <GradientText className="block" animationDelay={1.5}>
                multicanal para
              </GradientText>
              <GradientText className="block" animationDelay={3}>
                clinicas dentales
              </GradientText>
            </h1>

            <p className="mt-8 max-w-2xl text-editorial-subhead">
              Responde WhatsApp y llamadas, agenda y reprograma citas, recoge los datos
              de pacientes nuevos, confirma asistencia y ayuda a recuperar huecos y
              pacientes inactivos.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link href="/contact-sales">
                <MinimalButton size="xl" className="w-full sm:w-auto">
                  Solicitar demo
                  <ArrowRight className="h-4 w-4" />
                </MinimalButton>
              </Link>
              <Link href="/#flujo-clinico">
                <MinimalButton variant="outline" size="xl" className="w-full sm:w-auto">
                  Ver flujo real
                </MinimalButton>
              </Link>
            </div>
          </FadeContent>

          <FadeContent delay={0.2}>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {clinicMarketingStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border/50 bg-card/80 p-5 shadow-sm backdrop-blur">
                  <p className="text-3xl font-semibold tracking-tight">{stat.value}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </FadeContent>
        </div>

        <FadeContent delay={0.25} className="w-full max-w-xl lg:ml-auto">
          <div className="relative overflow-hidden rounded-[28px] border border-border/60 bg-[color-mix(in_srgb,var(--background)_72%,white)] p-6 shadow-[0_30px_80px_rgba(17,24,39,0.12)]">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-editorial-tiny">WhatsApp</p>
                    <h3 className="mt-2 text-lg font-semibold">Paciente existente detectado</h3>
                  </div>
                  <MessageCircleMore className="h-5 w-5 text-accent" />
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  "Si se ha liberado un hueco antes, me viene mejor esta tarde."
                </p>
                <div className="mt-4 rounded-xl bg-muted/70 p-4 text-sm">
                  Hueco libre encontrado a las 13:10. La IA propone adelantar y deja la
                  confirmacion lista.
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-card p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-editorial-tiny">Llamada</p>
                    <PhoneCall className="h-5 w-5 text-foreground" />
                  </div>
                  <p className="mt-3 text-sm font-medium">Nueva paciente - primera visita</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Callback sugerido con checklist previo y formulario preparado.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-editorial-tiny">Agenda</p>
                    <CalendarDays className="h-5 w-5 text-foreground" />
                  </div>
                  <p className="mt-3 text-sm font-medium">3 confirmaciones pendientes</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    1 cancelacion hoy, 1 hueco recuperable, 2 formularios abiertos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </FadeContent>
      </div>
    </section>
  );
}
