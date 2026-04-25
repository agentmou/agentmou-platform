'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface NewAppointmentInput {
  patientName: string;
  startsAt: string;
  service: string;
  notes?: string;
}

interface NewAppointmentDialogProps {
  onCreate?: (input: NewAppointmentInput) => Promise<void> | void;
  triggerLabel?: string;
}

export function NewAppointmentDialog({
  onCreate,
  triggerLabel = 'Nueva cita',
}: NewAppointmentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [form, setForm] = React.useState<NewAppointmentInput>({
    patientName: '',
    startsAt: '',
    service: '',
    notes: '',
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (onCreate) {
        await onCreate(form);
      } else {
        toast.success('Cita registrada', {
          description: `${form.patientName || 'Sin paciente'} · ${
            form.startsAt || 'Sin fecha'
          }. La integración real aún no está conectada; este registro es un eco visual.`,
        });
      }
      setForm({ patientName: '', startsAt: '', service: '', notes: '' });
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = <K extends keyof NewAppointmentInput>(
    field: K,
    value: NewAppointmentInput[K]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva cita</DialogTitle>
          <DialogDescription>
            Registra una visita manual para añadirla a la agenda priorizada.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-appointment-patient">Paciente</Label>
            <Input
              id="new-appointment-patient"
              value={form.patientName}
              onChange={(event) => updateField('patientName', event.target.value)}
              placeholder="Nombre del paciente"
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-appointment-starts-at">Fecha y hora</Label>
              <Input
                id="new-appointment-starts-at"
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => updateField('startsAt', event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-appointment-service">Servicio</Label>
              <Input
                id="new-appointment-service"
                value={form.service}
                onChange={(event) => updateField('service', event.target.value)}
                placeholder="Revisión, limpieza, ortodoncia..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-appointment-notes">Notas internas</Label>
            <Textarea
              id="new-appointment-notes"
              value={form.notes ?? ''}
              onChange={(event) => updateField('notes', event.target.value)}
              placeholder="Contexto opcional para recepción"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creando…' : 'Crear cita'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
