'use client'

import { cn } from '@/lib/utils'
import type { CSSProperties } from 'react'

interface StarBorderProps {
  children: React.ReactNode
  as?: React.ElementType
  className?: string
  color?: string
  speed?: string
  thickness?: number
}

export function StarBorder({
  as: Component = 'div',
  children,
  className,
  color = 'hsl(var(--accent))',
  speed = '6s',
  thickness = 1,
}: StarBorderProps) {
  return (
    <Component
      className={cn('star-border-container relative inline-block overflow-hidden rounded-md', className)}
      style={{ '--star-speed': speed, '--star-thickness': `${thickness}px` } as CSSProperties}
    >
      <div
        className="border-gradient-top absolute left-[-250%] top-[-12px] h-1/2 w-[300%] rounded-[50%] opacity-70"
        style={{
          background: `radial-gradient(ellipse at center, ${color}, transparent 60%)`,
          animation: `star-movement-top ${speed} linear infinite alternate`,
        }}
      />
      <div
        className="border-gradient-bottom absolute bottom-[-12px] right-[-250%] h-1/2 w-[300%] rounded-[50%] opacity-70"
        style={{
          background: `radial-gradient(ellipse at center, ${color}, transparent 60%)`,
          animation: `star-movement-bottom ${speed} linear infinite alternate`,
        }}
      />
      <div className="relative z-[1] rounded-[inherit] border border-border/50 bg-background">
        {children}
      </div>
    </Component>
  )
}
