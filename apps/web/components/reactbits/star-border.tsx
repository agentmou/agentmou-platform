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
  color = 'var(--accent)',
  speed = '6s',
  thickness = 0.5,
}: StarBorderProps) {
  const inset = thickness
  return (
    <Component
      className={cn('star-border-container relative inline-block overflow-hidden rounded-md', className)}
      style={{ '--star-speed': speed, '--star-thickness': `${thickness}px` } as CSSProperties}
    >
      {/* Gradient layer — visible in the border area */}
      <div className="absolute inset-0" aria-hidden>
        <div
          className="border-gradient-top absolute left-[-250%] top-[-12px] h-1/2 w-[300%] rounded-[50%] opacity-[0.65]"
          style={{
            background: `radial-gradient(ellipse at center, ${color}, transparent 55%)`,
            animation: `star-movement-top ${speed} linear infinite alternate`,
          }}
        />
        <div
          className="border-gradient-bottom absolute bottom-[-12px] right-[-250%] h-1/2 w-[300%] rounded-[50%] opacity-[0.65]"
          style={{
            background: `radial-gradient(ellipse at center, ${color}, transparent 55%)`,
            animation: `star-movement-bottom ${speed} linear infinite alternate`,
          }}
        />
      </div>
      {/* Content inset so gradient shows as border */}
      <div
        className="relative z-10 border border-border/30 bg-background"
        style={{
          inset: inset,
          position: 'absolute',
          borderRadius: `calc(var(--radius) - ${thickness}px)`,
        }}
      >
        {children}
      </div>
    </Component>
  )
}
