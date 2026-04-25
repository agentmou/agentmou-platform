'use client';

import * as React from 'react';
import type { AppointmentDetail, PatientListItem } from '@agentmou/contracts';
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
import { useDataProvider } from '@/lib/providers/context';
import { useTenantExperience } from '@/lib/tenant-experience';
import { cn } from '@/lib/utils';

interface NewAppointmentDialogProps {
  /**
   * Notified after the appointment is created so callers can refresh
   * their cached agenda. Receives the full `AppointmentDetail` returned
   * by the API.
   */
  onCreated?: (appointment: AppointmentDetail) => void;
  triggerLabel?: string;
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90] as const;

interface FormState {
  patientName: string;
  selectedPatient: PatientListItem | null;
  startsAt: string;
  durationMinutes: number;
  serviceLabel: string;
  notes: string;
}

const INITIAL_FORM: FormState = {
  patientName: '',
  selectedPatient: null,
  startsAt: '',
  durationMinutes: 30,
  serviceLabel: '',
  notes: '',
};

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function computeEndsAtIso(startsAtLocal: string, durationMinutes: number): string {
  // <input type="datetime-local"> emits "YYYY-MM-DDTHH:mm" in the user's
  // local timezone. We turn that into an ISO instant for the backend.
  const start = new Date(startsAtLocal);
  if (Number.isNaN(start.getTime())) {
    throw new Error('Fecha y hora inválidas');
  }
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return end.toISOString();
}

export function NewAppointmentDialog({
  onCreated,
  triggerLabel = 'Nueva cita',
}: NewAppointmentDialogProps) {
  const provider = useDataProvider();
  const experience = useTenantExperience();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Patient suggestions — debounced server query.
  const [suggestions, setSuggestions] = React.useState<PatientListItem[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  React.useEffect(() => {
    const search = form.patientName.trim();
    const tenantId = experience.tenantId;
    if (!open || !tenantId || search.length < 2 || form.selectedPatient) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      provider
        .listClinicPatients(tenantId, { search, limit: 6 })
        .then((response) => setSuggestions(response.patients))
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(handle);
  }, [provider, experience.tenantId, form.patientName, form.selectedPatient, open]);

  const updateField = React.useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
    },
    []
  );

  const handleSelectPatient = (patient: PatientListItem) => {
    setForm((current) => ({
      ...current,
      patientName: patient.fullName,
      selectedPatient: patient,
    }));
    setShowSuggestions(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!experience.tenantId) {
      toast.error('No hay un centro activo');
      return;
    }

    const trimmedName = form.patientName.trim();
    if (!trimmedName) {
      toast.error('Indica el paciente');
      return;
    }
    if (!form.startsAt) {
      toast.error('Indica fecha y hora');
      return;
    }

    let endsAt: string;
    let startsAtIso: string;
    try {
      const startDate = new Date(form.startsAt);
      if (Number.isNaN(startDate.getTime())) {
        throw new Error('Fecha y hora inválidas');
      }
      startsAtIso = startDate.toISOString();
      endsAt = computeEndsAtIso(form.startsAt, form.durationMinutes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fecha y hora inválidas');
      return;
    }

    setIsSubmitting(true);
    try {
      let patientId = form.selectedPatient?.id ?? null;
      if (!patientId) {
        const { firstName, lastName } = splitName(trimmedName);
        const created = await provider.createClinicPatient(experience.tenantId, {
          firstName,
          lastName,
          source: 'manual',
        });
        patientId = created.patient.id;
      }

      const metadata: Record<string, unknown> = {};
      if (form.serviceLabel.trim()) metadata.serviceLabel = form.serviceLabel.trim();
      if (form.notes.trim()) metadata.notes = form.notes.trim();

      const appointment = await provider.createClinicAppointment(experience.tenantId, {
        patientId,
        startsAt: startsAtIso,
        endsAt,
        source: 'manual',
        ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
      });

      toast.success('Cita creada', {
        description: `${trimmedName} · ${new Date(startsAtIso).toLocaleString()}`,
      });
      onCreated?.(appointment);
      setForm(INITIAL_FORM);
      setSuggestions([]);
      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No hemos podido crear la cita.';
      toast.error('No hemos podido crear la cita', { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setForm(INITIAL_FORM);
          setSuggestions([]);
        }
      }}
    >
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
            <div className="relative">
              <Input
                id="new-appointment-patient"
                value={form.patientName}
                onChange={(event) => {
                  updateField('patientName', event.target.value);
                  if (
                    form.selectedPatient &&
                    event.target.value !== form.selectedPatient.fullName
                  ) {
                    updateField('selectedPatient', null);
                  }
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Busca por nombre, teléfono o email"
                autoComplete="off"
                required
              />
              {showSuggestions && suggestions.length > 0 && !form.selectedPatient ? (
                <div
                  role="listbox"
                  className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-md border bg-popover p-1 shadow-md"
                >
                  {suggestions.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => handleSelectPatient(patient)}
                      className={cn(
                        'flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-left text-sm',
                        'hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <span className="font-medium">{patient.fullName}</span>
                      <span className="text-xs text-muted-foreground">
                        {patient.phone ?? patient.email ?? 'Sin contacto'}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {!form.selectedPatient && form.patientName.trim().length >= 2 ? (
              <p className="text-xs text-muted-foreground">
                Si no aparece, crearemos un paciente nuevo con este nombre al guardar.
              </p>
            ) : null}
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
              <Label htmlFor="new-appointment-duration">Duración</Label>
              <select
                id="new-appointment-duration"
                value={form.durationMinutes}
                onChange={(event) => updateField('durationMinutes', Number(event.target.value))}
                className="form-select w-full"
              >
                {DURATION_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} min
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-appointment-service">Servicio</Label>
            <Input
              id="new-appointment-service"
              value={form.serviceLabel}
              onChange={(event) => updateField('serviceLabel', event.target.value)}
              placeholder="Revisión, limpieza, ortodoncia..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-appointment-notes">Notas internas</Label>
            <Textarea
              id="new-appointment-notes"
              value={form.notes}
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
