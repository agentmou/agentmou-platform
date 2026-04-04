import type { ReactivationCampaign } from '@agentmou/contracts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ReactivationCampaignCard({
  campaign,
}: {
  campaign: ReactivationCampaign;
}) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">{campaign.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>{campaign.campaignType}</p>
        <p>Estado: {campaign.status}</p>
        <p>
          Iniciada{' '}
          {campaign.startedAt ? new Date(campaign.startedAt).toLocaleString() : 'pendiente de inicio'}
        </p>
      </CardContent>
    </Card>
  );
}
