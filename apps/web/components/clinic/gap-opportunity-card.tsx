import type { GapOpportunityDetail } from '@agentmou/contracts';

import { formatClinicLabel, formatClinicTime } from '@/lib/clinic-formatting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function GapOpportunityCard({
  gap,
  timezone,
}: {
  gap: GapOpportunityDetail;
  timezone: string;
}) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Hueco {formatClinicLabel(gap.status)}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>
          {formatClinicTime(gap.startsAt, timezone)}
          {' - '}
          {formatClinicTime(gap.endsAt, timezone)}
        </p>
        <p>Origen: {formatClinicLabel(gap.origin)}</p>
        <p>Intentos enviados: {gap.outreachAttempts.length}</p>
      </CardContent>
    </Card>
  );
}
