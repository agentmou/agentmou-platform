'use client'

import { cn } from '@/lib/utils'

interface HalftoneBackgroundProps {
  className?: string
  variant?: 'mint' | 'charcoalVignette' | 'mintTop'
  intensity?: 'low' | 'med' | 'high'
  children?: React.ReactNode
}

/**
 * HalftoneBackground - Brand signature dot gradient
 * 
 * Variants:
 * - mint: Mint dots concentrated at bottom, fading upward
 * - mintTop: Mint dots at top, fading downward
 * - charcoalVignette: Soft gray vignette at bottom
 * 
 * Intensity controls dot size, opacity, and gradient spread
 */
export function HalftoneBackground({
  className,
  variant = 'mint',
  intensity = 'med',
  children,
}: HalftoneBackgroundProps) {
  // Intensity configurations
  const intensityConfig = {
    low: { dotSize: 20, dotOpacity: 0.04, glowOpacity: 0.03, spread: '50%' },
    med: { dotSize: 14, dotOpacity: 0.07, glowOpacity: 0.05, spread: '60%' },
    high: { dotSize: 10, dotOpacity: 0.10, glowOpacity: 0.07, spread: '75%' },
  }

  const config = intensityConfig[intensity]

  // Mint gradient (bottom to top)
  if (variant === 'mint') {
    return (
      <div className={cn('relative overflow-hidden', className)}>
        {/* Dot pattern - mint, concentrated at bottom */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(95, 223, 142, ${config.dotOpacity}) 1.5px, transparent 1.5px)`,
            backgroundSize: `${config.dotSize}px ${config.dotSize}px`,
            maskImage: `linear-gradient(to top, black 0%, black 15%, transparent ${config.spread})`,
            WebkitMaskImage: `linear-gradient(to top, black 0%, black 15%, transparent ${config.spread})`,
          }}
        />
        
        {/* Soft mint glow at bottom */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 120% 60% at 50% 100%, rgba(95, 223, 142, ${config.glowOpacity}) 0%, transparent 70%)`,
          }}
        />
        
        {/* Content */}
        <div className="relative z-10">{children}</div>
      </div>
    )
  }

  // Mint gradient from top
  if (variant === 'mintTop') {
    return (
      <div className={cn('relative overflow-hidden', className)}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(95, 223, 142, ${config.dotOpacity}) 1.5px, transparent 1.5px)`,
            backgroundSize: `${config.dotSize}px ${config.dotSize}px`,
            maskImage: `linear-gradient(to bottom, black 0%, black 10%, transparent ${config.spread})`,
            WebkitMaskImage: `linear-gradient(to bottom, black 0%, black 10%, transparent ${config.spread})`,
          }}
        />
        
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 120% 40% at 50% 0%, rgba(95, 223, 142, ${config.glowOpacity}) 0%, transparent 60%)`,
          }}
        />
        
        <div className="relative z-10">{children}</div>
      </div>
    )
  }

  // Charcoal vignette (bottom)
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Charcoal dot pattern - gray, fading up */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(17, 17, 17, ${config.dotOpacity * 0.6}) 1px, transparent 1px)`,
          backgroundSize: `${config.dotSize}px ${config.dotSize}px`,
          maskImage: `linear-gradient(to top, black 0%, transparent 30%)`,
          WebkitMaskImage: `linear-gradient(to top, black 0%, transparent 30%)`,
        }}
      />
      
      {/* Soft vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(to top, rgba(17, 17, 17, ${config.glowOpacity * 0.5}) 0%, transparent 25%)`,
        }}
      />
      
      <div className="relative z-10">{children}</div>
    </div>
  )
}
