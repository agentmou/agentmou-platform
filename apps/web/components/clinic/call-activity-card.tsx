import type { CallSessionDetail } from '@agentmou/contracts';
import { PhoneCall } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CallActivityCard({ call }: { call: CallSessionDetail }) {
  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <PhoneCall className="h-4 w-4" />
        </span>
        <div>
          <CardTitle className="text-base">{call.patient?.fullName ?? 'Llamada entrante'}</CardTitle>
          <p className="text-sm text-muted-foreground">{call.status}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>{call.summary ?? 'Sin resumen disponible'}</p>
        <p>Duracion: {Math.round(call.durationSeconds / 60)} min</p>
      </CardContent>
    </Card>
  );
}
