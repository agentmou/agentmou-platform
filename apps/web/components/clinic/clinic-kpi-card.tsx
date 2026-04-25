import { ArrowUpRight } from 'lucide-react';

import { cn } from '@/lib/utils';

type ClinicKpiTone = 'default' | 'success' | 'warning';

const ICON_TONE: Record<ClinicKpiTone, string> = {
  default: '',
  success: 'success',
  warning: 'warn',
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
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-row">
        <div>
          <div className="kpi-val">{value}</div>
          {helper ? <div className="kpi-helper">{helper}</div> : null}
        </div>
        <div className={cn('kpi-icon', ICON_TONE[tone] || undefined)} aria-hidden>
          <ArrowUpRight size={16} />
        </div>
      </div>
    </div>
  );
}
