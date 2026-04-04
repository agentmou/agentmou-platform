import type { Patient } from '@agentmou/contracts';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<Patient['status'], string> = {
  new_lead: 'Nuevo paciente',
  intake_pending: 'Intake pendiente',
  existing: 'Paciente existente',
  waiting: 'En espera',
  inactive: 'Para reactivar',
  reactivated: 'Reactivado',
  do_not_contact: 'No contactar',
};

export function PatientStatusBadge({
  status,
  isExisting,
}: {
  status: Patient['status'];
  isExisting: boolean;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'border-transparent',
        isExisting ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-700',
        status === 'inactive' && 'bg-amber-100 text-amber-700',
        status === 'do_not_contact' && 'bg-neutral-200 text-neutral-600',
        status === 'intake_pending' && 'bg-sky-100 text-sky-700',
        status === 'reactivated' && 'bg-violet-100 text-violet-700',
        status === 'waiting' && 'bg-orange-100 text-orange-700'
      )}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
