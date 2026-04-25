import type { CallSessionDetail } from '@agentmou/contracts';
import { ArrowDownLeft, ArrowUpRight, Phone, TriangleAlert } from 'lucide-react';

import { formatClinicLabel } from '@/lib/clinic-formatting';
import { cn } from '@/lib/utils';

const CALL_STATUS_PILL: Record<string, string> = {
  completed: 'pill-success',
  in_progress: 'pill-primary',
  ringing: 'pill-primary',
  failed: 'pill-destructive',
  abandoned: 'pill-destructive',
  voicemail: 'pill-warning',
  missed: 'pill-destructive',
  scheduled: 'pill-warning',
};

function getInitials(name?: string | null) {
  if (!name) return '··';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '··';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDuration(seconds: number) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export function CallActivityCard({ call }: { call: CallSessionDetail }) {
  const initials = getInitials(call.patient?.fullName);
  const pillClass = CALL_STATUS_PILL[call.status] ?? 'pill-outline';
  const DirIcon = call.direction === 'outbound' ? ArrowUpRight : ArrowDownLeft;

  return (
    <div className="call-row">
      <div className="call-avatar" aria-hidden>
        {initials}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-[13px] font-semibold tracking-tight">
            {call.patient?.fullName ?? 'Llamada entrante'}
          </div>
          <DirIcon size={12} aria-hidden style={{ color: 'var(--muted-fg)' }} />
          {call.requiresHumanReview ? (
            <span className="pill pill-warning">
              <TriangleAlert size={11} aria-hidden />
              Escalada
            </span>
          ) : null}
        </div>
        <div className="text-xs" style={{ color: 'var(--muted-fg)' }}>
          {call.summary ?? 'Sin resumen disponible'}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn('pill', pillClass)}>{formatClinicLabel(call.status)}</span>
      </div>
      <div
        className="text-xs tabular-nums"
        style={{ color: 'var(--muted-fg)', fontFamily: 'var(--font-mono)' }}
      >
        <Phone size={12} className="-mt-0.5 mr-1 inline-block align-middle" aria-hidden />
        {formatDuration(call.durationSeconds)}
      </div>
    </div>
  );
}
