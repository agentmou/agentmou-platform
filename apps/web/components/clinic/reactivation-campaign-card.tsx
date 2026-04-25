import type { ReactivationCampaign } from '@agentmou/contracts';

import { formatClinicDateTime, formatClinicLabel } from '@/lib/clinic-formatting';
import { cn } from '@/lib/utils';

const CAMPAIGN_PILL: Record<string, string> = {
  active: 'pill-success',
  running: 'pill-success',
  scheduled: 'pill-outline',
  paused: 'pill-warning',
  completed: 'pill-primary',
  draft: 'pill-outline',
  cancelled: 'pill-destructive',
};

export function ReactivationCampaignCard({
  campaign,
  timezone,
}: {
  campaign: ReactivationCampaign;
  timezone: string;
}) {
  const pillClass = CAMPAIGN_PILL[campaign.status] ?? 'pill-outline';
  const startedLabel = campaign.startedAt
    ? formatClinicDateTime(campaign.startedAt, timezone)
    : 'pendiente de inicio';

  // Audience / progress numbers come from audienceDefinition once the
  // backend exposes them; for now we render placeholders so the
  // visual structure matches the prototype.
  const sent = 0;
  const replied = 0;
  const booked = 0;
  const progress = Math.min(100, sent === 0 ? 0 : Math.round((booked / sent) * 100));

  return (
    <div className="campaign-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold tracking-tight">{campaign.name}</div>
          <div className="mt-1 text-[11px]" style={{ color: 'var(--muted-fg)' }}>
            {formatClinicLabel(campaign.campaignType)} · iniciada {startedLabel}
          </div>
        </div>
        <span className={cn('pill', pillClass)}>{formatClinicLabel(campaign.status)}</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <div className="text-[18px] font-semibold tabular-nums tracking-tight">{sent}</div>
          <div
            className="text-[10px] uppercase tracking-[0.08em]"
            style={{ color: 'var(--muted-fg)' }}
          >
            Enviados
          </div>
        </div>
        <div>
          <div className="text-[18px] font-semibold tabular-nums tracking-tight">{replied}</div>
          <div
            className="text-[10px] uppercase tracking-[0.08em]"
            style={{ color: 'var(--muted-fg)' }}
          >
            Respondidos
          </div>
        </div>
        <div>
          <div className="text-[18px] font-semibold tabular-nums tracking-tight">{booked}</div>
          <div
            className="text-[10px] uppercase tracking-[0.08em]"
            style={{ color: 'var(--muted-fg)' }}
          >
            Reservadas
          </div>
        </div>
      </div>

      <div className="campaign-progress-bar" role="progressbar" aria-valuenow={progress}>
        <div className="campaign-progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
