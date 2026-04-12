import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { FadeContent } from '@/components/reactbits/fade-content';
import { MinimalButton } from '@/components/ui/minimal-button';
import { clinicTrustCards } from '@/lib/marketing/clinic-site';
import { PUBLIC_DEMO_CLINIC_HREF } from '@/lib/marketing/public-links';

export function ClinicTrustSection() {
  return (
    <section id="control" className="border-t border-border/50 bg-[var(--marketing-bg-base)] py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeContent>
          <p className="text-editorial-tiny">Confianza y control</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Tecnologia visible para negocio, control visible para la clinica
          </h2>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            La experiencia publica vende recepcion, agenda y recuperacion. Detras, el equipo
            conserva revision humana, permisos y trazabilidad.
          </p>
        </FadeContent>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {clinicTrustCards.map((item, index) => (
            <FadeContent key={item.title} delay={index * 0.05}>
              <div className="rounded-[24px] border border-border/60 bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-muted p-2">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            </FadeContent>
          ))}
        </div>

        <FadeContent delay={0.1}>
          <div className="mt-12 flex flex-col gap-4 rounded-[24px] border border-border/60 bg-[var(--marketing-bg-alt)] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold">Quieres ver el centro de recepcion en accion?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                La forma mas util de evaluarlo es abrir la demo clinic y recorrer bandeja, agenda,
                formularios y recuperacion desde la vista real de la clinica.
              </p>
            </div>
            <Link href={PUBLIC_DEMO_CLINIC_HREF}>
              <MinimalButton variant="outline">
                Ver demo clinic
                <ArrowRight className="h-4 w-4" />
              </MinimalButton>
            </Link>
          </div>
        </FadeContent>
      </div>
    </section>
  );
}
