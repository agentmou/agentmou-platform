import { ArrowUpRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ClinicKpiTone = 'default' | 'success' | 'warning';

const TONE_CLASSES: Record<ClinicKpiTone, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning-foreground',
};

export function ClinicKpiCard({
  label,
  value,
  helper,
  tone = 'default',
}: {
  label: string;
  value: number | string;
  helper?: string;
  tone?: ClinicKpiTone;
}) {
  return (
    <Card variant="raised">
      <CardHeader className="space-y-1 pb-3">
        <CardTitle className="text-text-muted text-xs uppercase tracking-[0.12em]">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-3">
        <div>
          <div className="text-text-primary text-3xl font-semibold tracking-tight">{value}</div>
          {helper ? <p className="text-text-secondary mt-1 text-sm">{helper}</p> : null}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            TONE_CLASSES[tone]
          )}
          aria-hidden
        >
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
