'use client';

import { cn } from '@/lib/utils';

interface RiskBadgeProps {
  level: 'low' | 'medium' | 'high' | 'critical';
  className?: string;
  showDot?: boolean;
}

export function RiskBadge({ level, className, showDot = true }: RiskBadgeProps) {
  const styles = {
    low: {
      bg: 'bg-transparent',
      border: 'border-accent',
      text: 'text-accent-foreground',
      dot: 'bg-accent',
    },
    medium: {
      bg: 'bg-transparent',
      border: 'border-muted-foreground/30',
      text: 'text-muted-foreground',
      dot: 'bg-muted-foreground',
    },
    high: {
      bg: 'bg-transparent',
      border: 'border-warning',
      text: 'text-warning-foreground',
      dot: 'bg-warning',
    },
    critical: {
      bg: 'bg-transparent',
      border: 'border-destructive',
      text: 'text-destructive',
      dot: 'bg-destructive',
    },
  };

  const style = styles[level];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] uppercase tracking-wide font-medium border rounded-sm',
        style.bg,
        style.border,
        style.text,
        className
      )}
    >
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />}
      {level}
    </span>
  );
}

// Status badge for agents/workflows
interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'error' | 'pending' | 'installed' | 'healthy' | 'degraded';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles = {
    active: { border: 'border-accent', text: 'text-foreground', dot: 'bg-accent' },
    installed: { border: 'border-accent', text: 'text-foreground', dot: 'bg-accent' },
    healthy: { border: 'border-accent', text: 'text-foreground', dot: 'bg-accent' },
    inactive: {
      border: 'border-muted-foreground/30',
      text: 'text-muted-foreground',
      dot: 'bg-muted-foreground',
    },
    pending: {
      border: 'border-muted-foreground/30',
      text: 'text-muted-foreground',
      dot: 'bg-muted-foreground',
    },
    degraded: { border: 'border-warning', text: 'text-foreground', dot: 'bg-warning' },
    error: { border: 'border-destructive', text: 'text-destructive', dot: 'bg-destructive' },
  };

  const style = styles[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] uppercase tracking-wide font-medium border rounded-sm',
        style.border,
        style.text,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
      {status}
    </span>
  );
}
