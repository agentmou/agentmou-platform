'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Availability } from '@agentmou/contracts'
import { Shield, AlertTriangle, CheckCircle2, Info, Zap, Clock, Beaker } from 'lucide-react'

// Unified badge styling - outline fine, no strong backgrounds
// Mint ONLY for: success/connected/healthy/low (very subtle)

interface BadgeProps {
  className?: string
}

// Risk Badge: low / medium / high
type RiskLevel = 'low' | 'medium' | 'high'

interface RiskBadgeProps extends BadgeProps {
  level: RiskLevel
  showIcon?: boolean
}

const riskConfig: Record<RiskLevel, { label: string; className: string; icon: typeof AlertTriangle }> = {
  low: {
    label: 'Low',
    className: 'border-accent/40 text-foreground bg-transparent',
    icon: CheckCircle2,
  },
  medium: {
    label: 'Medium',
    className: 'border-muted-foreground/30 text-foreground bg-transparent',
    icon: Info,
  },
  high: {
    label: 'High',
    className: 'border-foreground/40 text-foreground bg-transparent',
    icon: AlertTriangle,
  },
}

export function RiskBadge({ level, showIcon = true, className }: RiskBadgeProps) {
  const config = riskConfig[level]
  const Icon = config.icon
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'text-[10px] uppercase tracking-wide font-medium px-2 py-0.5',
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  )
}

// HITL Badge: optional / recommended / required
type HitlLevel = 'optional' | 'recommended' | 'required'

interface HitlBadgeProps extends BadgeProps {
  level: HitlLevel
  showIcon?: boolean
}

const hitlConfig: Record<HitlLevel, { label: string; className: string }> = {
  optional: {
    label: 'HITL Optional',
    className: 'border-muted-foreground/20 text-muted-foreground bg-transparent',
  },
  recommended: {
    label: 'HITL Recommended',
    className: 'border-muted-foreground/30 text-foreground bg-transparent',
  },
  required: {
    label: 'HITL Required',
    className: 'border-foreground/30 text-foreground bg-transparent',
  },
}

export function HitlBadge({ level, showIcon = true, className }: HitlBadgeProps) {
  const config = hitlConfig[level]
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'text-[10px] uppercase tracking-wide font-medium px-2 py-0.5',
        config.className,
        className
      )}
    >
      {showIcon && <Shield className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  )
}

// Complexity Badge: S / M / L
type ComplexityLevel = 'S' | 'M' | 'L'

interface ComplexityBadgeProps extends BadgeProps {
  level: ComplexityLevel
  showIcon?: boolean
}

const complexityConfig: Record<ComplexityLevel, { label: string; className: string }> = {
  S: {
    label: 'Simple',
    className: 'border-accent/40 text-foreground bg-transparent',
  },
  M: {
    label: 'Medium',
    className: 'border-muted-foreground/30 text-foreground bg-transparent',
  },
  L: {
    label: 'Large',
    className: 'border-foreground/30 text-foreground bg-transparent',
  },
}

export function ComplexityBadge({ level, showIcon = true, className }: ComplexityBadgeProps) {
  const config = complexityConfig[level]
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'text-[10px] uppercase tracking-wide font-medium px-2 py-0.5',
        config.className,
        className
      )}
    >
      {showIcon && <Zap className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  )
}

// Channel Badge: stable / beta
type Channel = 'stable' | 'beta'

interface ChannelBadgeProps extends BadgeProps {
  channel: Channel
}

const channelConfig: Record<Channel, { label: string; className: string }> = {
  stable: {
    label: 'Stable',
    className: 'border-accent/40 text-foreground bg-transparent',
  },
  beta: {
    label: 'Beta',
    className: 'border-muted-foreground/30 text-muted-foreground bg-transparent',
  },
}

export function ChannelBadge({ channel, className }: ChannelBadgeProps) {
  const config = channelConfig[channel]
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'text-[10px] uppercase tracking-wide font-medium px-2 py-0.5',
        config.className,
        className
      )}
    >
      {channel === 'beta' && <Beaker className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  )
}

// Status Pill: unified status indicator
type StatusType = 'success' | 'error' | 'warning' | 'pending' | 'running' | 'disabled' | 'connected' | 'disconnected' | 'active' | 'paused'

interface StatusPillProps extends BadgeProps {
  status: StatusType
  label?: string
  showDot?: boolean
}

const statusConfig: Record<StatusType, { defaultLabel: string; className: string; dotColor: string }> = {
  success: {
    defaultLabel: 'Success',
    className: 'border-accent/40 text-foreground bg-transparent',
    dotColor: 'bg-accent',
  },
  error: {
    defaultLabel: 'Error',
    className: 'border-foreground/30 text-foreground bg-transparent',
    dotColor: 'bg-foreground',
  },
  warning: {
    defaultLabel: 'Warning',
    className: 'border-muted-foreground/40 text-foreground bg-transparent',
    dotColor: 'bg-warning',
  },
  pending: {
    defaultLabel: 'Pending',
    className: 'border-muted-foreground/30 text-muted-foreground bg-transparent',
    dotColor: 'bg-muted-foreground',
  },
  running: {
    defaultLabel: 'Running',
    className: 'border-accent/40 text-foreground bg-transparent',
    dotColor: 'bg-accent animate-pulse',
  },
  disabled: {
    defaultLabel: 'Disabled',
    className: 'border-muted-foreground/20 text-muted-foreground bg-transparent',
    dotColor: 'bg-muted-foreground/50',
  },
  connected: {
    defaultLabel: 'Connected',
    className: 'border-accent/40 text-foreground bg-transparent',
    dotColor: 'bg-accent',
  },
  disconnected: {
    defaultLabel: 'Disconnected',
    className: 'border-muted-foreground/20 text-muted-foreground bg-transparent',
    dotColor: 'bg-muted-foreground/50',
  },
  active: {
    defaultLabel: 'Active',
    className: 'border-accent/40 text-foreground bg-transparent',
    dotColor: 'bg-accent',
  },
  paused: {
    defaultLabel: 'Paused',
    className: 'border-muted-foreground/30 text-muted-foreground bg-transparent',
    dotColor: 'bg-muted-foreground',
  },
}

export function StatusPill({ status, label, showDot = true, className }: StatusPillProps) {
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
      {showDot && <span className={cn('h-1.5 w-1.5 rounded-full mr-1.5', config.dotColor)} />}
      {label || config.defaultLabel}
    </Badge>
  )
}

// Availability Badge: planned / preview / available
interface AvailabilityBadgeProps extends BadgeProps {
  status: Availability
  showLabel?: boolean
}

const availabilityConfig: Record<
  Availability,
  { label: string; className: string; dotClass: string }
> = {
  available: {
    label: 'Available',
    className: 'border-accent/40 text-foreground bg-transparent',
    dotClass: 'bg-accent',
  },
  preview: {
    label: 'In catalog',
    className: 'border-muted-foreground/35 text-foreground bg-transparent',
    dotClass: 'bg-chart-2/80',
  },
  planned: {
    label: 'Coming soon',
    className: 'border-muted-foreground/20 text-muted-foreground bg-transparent',
    dotClass: 'bg-muted-foreground/50',
  },
}

export function AvailabilityBadge({ status, showLabel = true, className }: AvailabilityBadgeProps) {
  const config = availabilityConfig[status]
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] uppercase tracking-wide font-medium px-2 py-0.5',
        config.className,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full mr-1.5', config.dotClass)} />
      {showLabel && config.label}
    </Badge>
  )
}

// Audience Badge: business / personal / both
type AudienceType = 'business' | 'personal' | 'both'

interface AudienceBadgeProps extends BadgeProps {
  audience: AudienceType
}

const audienceConfig: Record<AudienceType, { label: string; className: string }> = {
  business: {
    label: 'Business',
    className: 'border-muted-foreground/30 text-foreground bg-transparent',
  },
  personal: {
    label: 'Personal',
    className: 'border-muted-foreground/30 text-foreground bg-transparent',
  },
  both: {
    label: 'All',
    className: 'border-muted-foreground/20 text-muted-foreground bg-transparent',
  },
}

export function AudienceBadge({ audience, className }: AudienceBadgeProps) {
  const config = audienceConfig[audience]
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'text-[10px] uppercase tracking-wide font-medium px-2 py-0.5',
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  )
}

// Domain Badge
interface DomainBadgeProps extends BadgeProps {
  domain: string
}

export function DomainBadge({ domain, className }: DomainBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 border-border text-muted-foreground bg-transparent capitalize',
        className
      )}
    >
      {domain}
    </Badge>
  )
}

// Setup Time Badge
interface SetupTimeBadgeProps extends BadgeProps {
  minutes: number
}

export function SetupTimeBadge({ minutes, className }: SetupTimeBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 border-muted-foreground/20 text-muted-foreground bg-transparent',
        className
      )}
    >
      <Clock className="h-3 w-3 mr-1" />
      {minutes}min
    </Badge>
  )
}

// Integration Chip
interface IntegrationChipProps extends BadgeProps {
  name: string
}

export function IntegrationChip({ name, className }: IntegrationChipProps) {
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'text-[10px] tracking-wide font-normal px-2 py-0.5 border-border text-muted-foreground bg-transparent',
        className
      )}
    >
      {name}
    </Badge>
  )
}

// Spec Line - compact display of agent/workflow specs
interface SpecLineProps {
  risk?: RiskLevel
  hitl?: HitlLevel
  complexity?: ComplexityLevel
  setupMinutes?: number
  version?: string
  channel?: Channel
  className?: string
}

export function SpecLine({ risk, hitl, complexity, setupMinutes, version, channel, className }: SpecLineProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {risk && <RiskBadge level={risk} showIcon={false} />}
      {hitl && <HitlBadge level={hitl} showIcon={false} />}
      {complexity && <ComplexityBadge level={complexity} showIcon={false} />}
      {setupMinutes && <SetupTimeBadge minutes={setupMinutes} />}
      {version && (
        <Badge variant="outline" className="text-[10px] tracking-wide font-medium px-2 py-0.5 border-muted-foreground/20 text-muted-foreground bg-transparent">
          v{version}
        </Badge>
      )}
      {channel && <ChannelBadge channel={channel} />}
    </div>
  )
}
