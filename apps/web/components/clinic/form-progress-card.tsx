import type { IntakeFormSubmission } from '@agentmou/contracts';

import { Card, CardContent } from '@/components/ui/card';

export function FormProgressCard({ submission }: { submission: IntakeFormSubmission }) {
  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="font-medium">Formulario {submission.status}</p>
          <p className="text-sm text-muted-foreground">
            Expira{' '}
            {submission.expiresAt ? new Date(submission.expiresAt).toLocaleString() : 'sin fecha'}
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {submission.requiredForBooking ? 'Necesario para agendar' : 'Opcional'}
        </span>
      </CardContent>
    </Card>
  );
}
