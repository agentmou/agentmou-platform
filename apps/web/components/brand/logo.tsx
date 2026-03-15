'use client'

import { cn } from '@/lib/utils'

type LogoVariant = 'header' | 'footer' | 'sidebar' | 'sidebarCollapsed'

const variantClasses: Record<LogoVariant, string> = {
  header: 'h-8 w-auto',
  footer: 'h-6 w-auto',
  sidebar: 'h-7 w-auto',
  sidebarCollapsed: 'h-7 w-7 object-contain',
}

interface LogoProps {
  variant?: LogoVariant
  className?: string
}

/**
 * Agentmou brand logo. Use variant to control size across header, footer, and sidebar.
 */
export function Logo({ variant = 'header', className }: LogoProps) {
  const isCollapsed = variant === 'sidebarCollapsed'
  const src = isCollapsed ? '/isotipo_agentmou_32x32.png' : '/isotipo_agentmou.svg'

  return (
    <img
      src={src}
      alt="Agentmou"
      className={cn(variantClasses[variant], className)}
      width={isCollapsed ? 28 : undefined}
      height={isCollapsed ? 28 : undefined}
    />
  )
}
