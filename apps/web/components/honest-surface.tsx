'use client';

import { Beaker, Clock3, EyeOff, Lock, type LucideIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { HonestSurfaceState, HonestSurfaceTone } from '@/lib/honest-ui';

interface HonestSurfaceBadgeProps {
  state: HonestSurfaceState;
  className?: string;
}

interface HonestSurfaceNoticeProps {
  state: HonestSurfaceState;
  className?: string;
  title?: string;
  description?: string;
}

const toneConfig: Record<
  HonestSurfaceTone,
  {
    icon: LucideIcon;
    badgeClassName: string;
    noticeClassName: string;
  }
> = {
  preview: {
    icon: Beaker,
    badgeClassName: 'border-muted-foreground/30 text-foreground bg-transparent',
    noticeClassName: 'border-muted-foreground/20 bg-muted/20',
  },
  'read-only': {
    icon: Lock,
    badgeClassName: 'border-muted-foreground/25 text-muted-foreground bg-transparent',
    noticeClassName: 'border-muted-foreground/15 bg-muted/10',
  },
  'not-yet-available': {
    icon: Clock3,
    badgeClassName: 'border-foreground/20 text-foreground bg-transparent',
    noticeClassName: 'border-foreground/10 bg-muted/10',
  },
  demo: {
    icon: EyeOff,
    badgeClassName: 'border-accent/35 text-foreground bg-transparent',
    noticeClassName: 'border-accent/20 bg-accent/5',
  },
};

export function HonestSurfaceBadge({ state, className }: HonestSurfaceBadgeProps) {
  const config = toneConfig[state.tone];

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] uppercase tracking-wide font-medium px-2 py-0.5',
        config.badgeClassName,
        className
      )}
    >
      {state.label}
    </Badge>
  );
}

export function HonestSurfaceNotice({
  state,
  className,
  title,
  description,
}: HonestSurfaceNoticeProps) {
  const config = toneConfig[state.tone];
  const Icon = config.icon;

  return (
    <Alert className={cn(config.noticeClassName, className)}>
      <Icon className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        <span>{title || state.title}</span>
        <HonestSurfaceBadge state={state} />
      </AlertTitle>
      <AlertDescription>
        <p>{description || state.description}</p>
      </AlertDescription>
    </Alert>
  );
}
