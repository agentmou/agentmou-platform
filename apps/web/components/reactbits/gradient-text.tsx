'use client'

import { cn } from '@/lib/utils'

interface GradientTextProps {
  children: React.ReactNode
  className?: string
  colors?: string[]
  animationSpeed?: number
}

export function GradientText({
  children,
  className,
  colors = ['var(--accent)', 'var(--foreground)', 'var(--accent)'],
  animationSpeed = 6,
}: GradientTextProps) {
  const gradientColors = [...colors, colors[0]].join(', ')

  return (
    <span
      className={cn('inline-block bg-clip-text text-transparent', className)}
      style={{
        backgroundImage: `linear-gradient(to right, ${gradientColors})`,
        backgroundSize: '300% 100%',
        animation: `gradient-shift ${animationSpeed}s ease infinite alternate`,
      }}
    >
      {children}
    </span>
  )
}
