import { CalendarDays, MessageSquareMore, RefreshCcw } from 'lucide-react';
import { FadeContent } from '@/components/reactbits/fade-content';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { clinicMarketingJobs } from '@/lib/marketing/clinic-site';

const icons = [MessageSquareMore, CalendarDays, RefreshCcw] as const;

export function ClinicValueGrid() {
  return (
    <section id="producto" className="border-t border-border/50 bg-[var(--marketing-bg-alt)] py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeContent>
          <p className="text-editorial-tiny">Tres jobs, una sola recepción</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Atender, agendar y recuperar agenda
          </h2>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            La propuesta no es un bot genérico. Es una capa operativa pensada para recepción dental,
            con lenguaje de negocio y visibilidad real del día a día.
          </p>
        </FadeContent>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {clinicMarketingJobs.map((job, index) => {
            const Icon = icons[index];
            return (
              <FadeContent key={job.title} delay={index * 0.08}>
                <Card className="h-full rounded-[24px] border-border/60 bg-card/90 py-0 shadow-sm">
                  <CardHeader className="gap-4 border-b border-border/50 pb-6">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-editorial-tiny">{job.eyebrow}</p>
                      <div className="rounded-full bg-muted p-2">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl leading-tight">{job.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 pb-6 pt-6">
                    <p className="text-sm leading-6 text-muted-foreground">{job.description}</p>
                    <ul className="space-y-3">
                      {job.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3 text-sm">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-mint" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </FadeContent>
            );
          })}
        </div>
      </div>
    </section>
  );
}
