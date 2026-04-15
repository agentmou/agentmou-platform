import type { IntakeFormSubmission } from '@agentmou/contracts';

import { formatClinicDateTime, formatClinicLabel } from '@/lib/clinic-formatting';
import { Card, CardContent } from '@/components/ui/card';

export function FormProgressCard({
  submission,
  timezone,
}: {
  submission: IntakeFormSubmission;
  timezone: string;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="font-medium">Formulario {formatClinicLabel(submission.status)}</p>
          <p className="text-sm text-muted-foreground">
            Expira{' '}
            {submission.expiresAt
              ? formatClinicDateTime(submission.expiresAt, timezone)
              : 'sin fecha límite'}
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {submission.requiredForBooking ? 'Necesario para agendar' : 'Opcional'}
        </span>
      </CardContent>
    </Card>
  );
}
