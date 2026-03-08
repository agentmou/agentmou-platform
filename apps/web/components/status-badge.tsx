import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StatusType = 'success' | 'failed' | 'running' | 'enabled' | 'disabled' | 'connected' | 'disconnected' | 'pending' | 'paid' | 'overdue'

interface StatusBadgeProps {
  status: StatusType
  className?: string
}

// Editorial style: outline fine, no strong backgrounds
// Mint for success states (subtle, border only)
const statusConfig: Record<StatusType, { label: string; className: string; dotColor?: string }> = {
  success: {
    label: 'Success',
    className: 'border-accent/40 text-foreground bg-transparent',
    dotColor: 'bg-accent',
  },
  failed: {
    label: 'Failed',
    className: 'border-foreground/30 text-foreground bg-transparent',
    dotColor: 'bg-foreground',
  },
  running: {
    label: 'Running',
    className: 'border-accent/40 text-foreground bg-transparent',
    dotColor: 'bg-accent animate-pulse',
  },
  enabled: {
    label: 'Enabled',
    className: 'border-accent/40 text-foreground bg-transparent',
    dotColor: 'bg-accent',
  },
  disabled: {
    label: 'Disabled',
    className: 'border-muted-foreground/20 text-muted-foreground bg-transparent',
    dotColor: 'bg-muted-foreground/50',
  },
  connected: {
    label: 'Connected',
    className: 'border-accent/40 text-foreground bg-transparent',
    dotColor: 'bg-accent',
  },
  disconnected: {
    label: 'Disconnected',
    className: 'border-muted-foreground/20 text-muted-foreground bg-transparent',
    dotColor: 'bg-muted-foreground/50',
  },
  pending: {
    label: 'Pending',
    className: 'border-muted-foreground/30 text-muted-foreground bg-transparent',
    dotColor: 'bg-muted-foreground',
  },
  paid: {
    label: 'Paid',
    className: 'border-accent/40 text-foreground bg-transparent',
    dotColor: 'bg-accent',
  },
  overdue: {
    label: 'Overdue',
    className: 'border-foreground/30 text-foreground bg-transparent',
    dotColor: 'bg-foreground',
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'text-[10px] uppercase tracking-wide font-medium px-2 py-0.5',
        config.className, 
        className
      )}
    >
      {config.dotColor && (
        <span className={cn('h-1.5 w-1.5 rounded-full mr-1.5', config.dotColor)} />
      )}
      {config.label}
    </Badge>
  )
}
