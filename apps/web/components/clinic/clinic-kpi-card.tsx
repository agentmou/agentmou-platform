import { ArrowUpRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ClinicKpiCard({
  label,
  value,
  helper,
  tone = 'default',
}: {
  label: string;
  value: number | string;
  helper?: string;
  tone?: 'default' | 'success' | 'warning';
}) {
  return (
    <Card className="border-border/60">
      <CardHeader className="space-y-1 pb-3">
        <CardTitle className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-3">
        <div>
          <div className="text-3xl font-semibold tracking-tight">{value}</div>
          {helper ? <p className="mt-1 text-sm text-muted-foreground">{helper}</p> : null}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            tone === 'success' && 'bg-emerald-500/10 text-emerald-600',
            tone === 'warning' && 'bg-amber-500/10 text-amber-600',
            tone === 'default' && 'bg-accent/10 text-accent'
          )}
        >
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
