import { Cpu, GitBranch, ShieldCheck, Telescope } from 'lucide-react';
import type { MarketingCatalogWithStats } from '@/lib/marketing/featured-from-demo';
import { platformCapabilities } from '@/lib/marketing/clinic-site';
import { FadeContent } from '@/components/reactbits/fade-content';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const icons = [Cpu, GitBranch, Telescope] as const;

interface PlatformEngineGridProps {
  featuredCatalog: MarketingCatalogWithStats;
}

export function PlatformEngineGrid({ featuredCatalog }: PlatformEngineGridProps) {
  const stats = [
    `${featuredCatalog.gaInventoryCounts.agents} agentes GA`,
    `${featuredCatalog.gaInventoryCounts.workflows} workflows públicos`,
    `${featuredCatalog.gaInventoryCounts.packs} packs operativos`,
  ];

  return (
    <section className="border-t border-border/50 bg-[var(--marketing-bg-alt)] py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeContent>
          <p className="text-editorial-tiny">Narrativa técnica secundaria</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            El engine sigue aquí, solo que ya no ocupa la portada
          </h2>
          <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
            Agentmou sigue siendo el motor interno de automatización: control plane, approvals,
            observabilidad, n8n y catálogo siguen operativos, pero viven en una capa secundaria
            respecto a la propuesta visible para clínicas.
          </p>
        </FadeContent>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {platformCapabilities.map((item, index) => {
            const Icon = icons[index];
            return (
              <FadeContent key={item.title} delay={index * 0.05}>
                <Card className="h-full rounded-[24px] border-border/60 bg-card py-0">
                  <CardHeader className="gap-4 border-b border-border/50 pb-6">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-editorial-tiny">Platform</p>
                      <div className="rounded-full bg-muted p-2">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl leading-tight">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-6 pt-6">
                    <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {stats.map((stat) => (
                        <li key={`${item.title}-${stat}`} className="flex items-center gap-3">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          <span>{stat}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </FadeContent>
            );
          })}
        </div>

        <FadeContent delay={0.1}>
          <div className="mt-12 rounded-[24px] border border-border/60 bg-card p-6 shadow-sm">
            <p className="text-editorial-tiny">Featured engine surfaces</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {featuredCatalog.agents.map((agent) => (
                <div key={agent.id} className="rounded-2xl border border-border/50 bg-muted/30 p-4">
                  <p className="text-sm font-semibold">{agent.name}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{agent.description}</p>
                </div>
              ))}
              {featuredCatalog.workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="rounded-2xl border border-border/50 bg-muted/30 p-4"
                >
                  <p className="text-sm font-semibold">{workflow.name}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {workflow.trigger} - {workflow.action}
                  </p>
                </div>
              ))}
              {featuredCatalog.packs.map((pack) => (
                <div key={pack.id} className="rounded-2xl border border-border/50 bg-muted/30 p-4">
                  <p className="text-sm font-semibold">{pack.name}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{pack.description}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeContent>
      </div>
    </section>
  );
}
