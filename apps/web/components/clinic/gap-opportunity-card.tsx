import type { GapOpportunityDetail } from '@agentmou/contracts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function GapOpportunityCard({ gap }: { gap: GapOpportunityDetail }) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Hueco {gap.status}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>
          {new Date(gap.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {' - '}
          {new Date(gap.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p>Origen: {gap.origin}</p>
        <p>Intentos enviados: {gap.outreachAttempts.length}</p>
      </CardContent>
    </Card>
  );
}
