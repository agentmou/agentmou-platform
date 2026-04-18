'use client';

import * as React from 'react';
import type { AdminTenantDetail, VerticalKey } from '@agentmou/contracts';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/lib/auth/store';
import { useDataProvider } from '@/lib/providers/context';

/**
 * Admin-only control for the tenant's enabled-verticals list.
 *
 * The card renders three checkboxes (one per supported vertical) with
 * the currently-active vertical locked on. Saving sends the selected
 * set to `PATCH /admin/tenants/:id/verticals-enabled`; the backend
 * rejects dropping the active vertical with a 409.
 *
 * UX notes:
 *   - This is the only frontend surface that exercises the multi-vertical
 *     foundation today. The topbar switcher + per-user active preference
 *     are deferred until a tenant actually turns on more than one vertical
 *     (see `docs/plan/pr-09-multi-vertical-optional.md`).
 *   - We re-derive "checked" from the saved server state on every render
 *     so optimistic form drift cannot ship a mismatched list — the Save
 *     button compares server vs draft explicitly.
 */
const VERTICAL_OPTIONS: ReadonlyArray<{
  value: VerticalKey;
  label: string;
  description: string;
}> = [
  {
    value: 'internal',
    label: 'Internal',
    description: 'Consola interna y superficies de plataforma.',
  },
  {
    value: 'clinic',
    label: 'Clinic',
    description: 'Experiencia de recepción para clínicas dentales.',
  },
  {
    value: 'fisio',
    label: 'Fisio',
    description: 'Experiencia para centros de fisioterapia.',
  },
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed';
}

export interface AdminTenantVerticalsTogglerProps {
  detail: AdminTenantDetail;
  onUpdated: () => void;
}

export function AdminTenantVerticalsToggler({
  detail,
  onUpdated,
}: AdminTenantVerticalsTogglerProps) {
  const provider = useDataProvider();
  const adminTenantId = useAuthStore((state) => state.activeTenantId) ?? '';

  const savedEnabled = React.useMemo<VerticalKey[]>(() => {
    const fromConfigs = detail.verticalConfigs.map((config) => config.verticalKey);
    if (fromConfigs.length > 0) {
      return Array.from(new Set(fromConfigs));
    }
    // Legacy single-vertical tenant — the server returns an empty
    // `verticalConfigs`, so the effective enabled list is `[activeVertical]`.
    return [detail.activeVertical];
  }, [detail.activeVertical, detail.verticalConfigs]);

  const [draft, setDraft] = React.useState<ReadonlySet<VerticalKey>>(() => new Set(savedEnabled));

  React.useEffect(() => {
    setDraft(new Set(savedEnabled));
  }, [savedEnabled]);

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const savedSet = React.useMemo(() => new Set(savedEnabled), [savedEnabled]);
  const hasChanges =
    draft.size !== savedSet.size ||
    Array.from(draft).some((key) => !savedSet.has(key)) ||
    Array.from(savedSet).some((key) => !draft.has(key));

  const activeMissing = !draft.has(detail.activeVertical);

  const handleToggle = (vertical: VerticalKey) => {
    setDraft((previous) => {
      const next = new Set(previous);
      if (next.has(vertical)) {
        next.delete(vertical);
      } else {
        next.add(vertical);
      }
      return next;
    });
  };

  const handleReset = () => {
    setDraft(new Set(savedEnabled));
  };

  const handleSave = async () => {
    if (!hasChanges || activeMissing || draft.size === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await provider.updateAdminTenantEnabledVerticals(adminTenantId, detail.id, {
        enabled: Array.from(draft),
      });
      toast.success('Verticales enabled actualizadas');
      onUpdated();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card variant="raised">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">Verticales enabled</CardTitle>
        <p className="text-text-muted text-sm">
          Marca las verticales que puede operar este tenant. La vertical activa se queda siempre
          seleccionada — cámbiala primero desde &ldquo;Cambiar vertical&rdquo; si necesitas
          quitarla.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <fieldset className="space-y-3" disabled={isSubmitting}>
          <legend className="sr-only">Verticales enabled</legend>
          {VERTICAL_OPTIONS.map((option) => {
            const checked = draft.has(option.value);
            const locked = option.value === detail.activeVertical;
            const inputId = `vertical-${option.value}`;
            return (
              <label
                key={option.value}
                htmlFor={inputId}
                className="border-border-subtle hover:bg-card-hover flex cursor-pointer items-start gap-3 rounded-xl border p-3"
              >
                <input
                  id={inputId}
                  type="checkbox"
                  className="accent-accent mt-1 h-4 w-4"
                  checked={checked}
                  disabled={locked}
                  onChange={() => handleToggle(option.value)}
                />
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-text-primary font-medium">{option.label}</span>
                    {locked ? (
                      <Badge tone="info" variant="outline">
                        Active
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-text-muted text-xs">{option.description}</p>
                </div>
              </label>
            );
          })}
        </fieldset>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {hasChanges ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={isSubmitting}
              aria-label="Descartar cambios"
            >
              Descartar
            </Button>
          ) : null}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || activeMissing || isSubmitting}
            aria-label="Guardar la lista de verticales enabled"
          >
            Guardar cambios
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
