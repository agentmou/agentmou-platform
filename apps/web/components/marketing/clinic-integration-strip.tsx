import { FadeContent } from '@/components/reactbits/fade-content';
import { clinicIntegrations } from '@/lib/marketing/clinic-site';

export function ClinicIntegrationStrip() {
  return (
    <section
      id="integraciones"
      className="border-t border-border/50 bg-[var(--marketing-bg-alt)] py-18"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeContent>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-editorial-tiny">Integraciones</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Canales e integraciones que aterrizan en la operacion diaria
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {clinicIntegrations.map((integration) => (
                <span
                  key={integration}
                  className="rounded-full border border-border/60 bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm"
                >
                  {integration}
                </span>
              ))}
            </div>
          </div>
        </FadeContent>
      </div>
    </section>
  );
}
