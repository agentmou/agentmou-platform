import type { ReactivationCampaign } from '@agentmou/contracts';

import { formatClinicDateTime, formatClinicLabel } from '@/lib/clinic-formatting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ReactivationCampaignCard({
  campaign,
  timezone,
}: {
  campaign: ReactivationCampaign;
  timezone: string;
}) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">{campaign.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>{formatClinicLabel(campaign.campaignType)}</p>
        <p>Estado: {formatClinicLabel(campaign.status)}</p>
        <p>
          Iniciada{' '}
          {campaign.startedAt
            ? formatClinicDateTime(campaign.startedAt, timezone)
            : 'pendiente de inicio'}
        </p>
      </CardContent>
    </Card>
  );
}
