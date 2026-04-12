import { FadeContent } from '@/components/reactbits/fade-content';
import { clinicBeforeAfter } from '@/lib/marketing/clinic-site';

export function ClinicBeforeAfterSection() {
  return (
    <section className="border-t border-border/50 bg-[var(--marketing-bg-alt)] py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeContent>
          <p className="text-editorial-tiny">Antes vs despues</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            El cambio se compra mejor cuando se entiende el contraste
          </h2>
        </FadeContent>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {clinicBeforeAfter.map((column, index) => (
            <FadeContent key={column.title} delay={index * 0.08}>
              <article
                className={`rounded-[26px] border p-7 shadow-sm ${
                  index === 0
                    ? 'border-border/60 bg-card'
                    : 'border-foreground bg-[color-mix(in_srgb,var(--accent)_10%,white)]'
                }`}
              >
                <p className="text-editorial-tiny">
                  {index === 0 ? 'Situacion actual' : 'Situacion objetivo'}
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight">{column.title}</h3>
                <ul className="mt-8 space-y-4">
                  {column.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </FadeContent>
          ))}
        </div>
      </div>
    </section>
  );
}
