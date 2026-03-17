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
      className={cn('star-border-container relative inline-grid overflow-hidden rounded-md', className)}
      style={{
        '--star-speed': speed,
        '--star-thickness': `${thickness}px`,
        padding: `${inset}px`,
      } as CSSProperties}
    >
      {/* Gradient extends into padding area to create border effect */}
      <div
        className="absolute aria-hidden"
        style={{ inset: `-${inset}px` }}
      >
        {/* Top — reduced offset so glow reaches top edge; taller blob for better coverage */}
        <div
          className="border-gradient-top absolute left-[-250%] top-[-2px] h-2/3 w-[300%] rounded-[50%] opacity-[0.7]"
          style={{
            background: `radial-gradient(ellipse at center, ${color}, transparent 65%)`,
            animation: `star-movement-top ${speed} linear infinite alternate`,
          }}
        />
        {/* Bottom — same adjustments for symmetrical coverage */}
        <div
          className="border-gradient-bottom absolute bottom-[-2px] right-[-250%] h-2/3 w-[300%] rounded-[50%] opacity-[0.7]"
          style={{
            background: `radial-gradient(ellipse at center, ${color}, transparent 65%)`,
            animation: `star-movement-bottom ${speed} linear infinite alternate`,
          }}
        />
      </div>
      {/* Content — fills inner area; padding creates the border gap (like original inset) */}
      <div
        className="relative z-10 col-start-1 row-start-1 min-w-0 border border-border/30 bg-background"
        style={{
          borderRadius: `calc(var(--radius) - ${thickness}px)`,
        }}
      >
        {children}
      </div>
    </Component>
  )
}
