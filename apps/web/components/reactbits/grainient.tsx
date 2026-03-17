'use client'

import { cn } from '@/lib/utils'

interface GrainientProps {
  className?: string
  /** Colors for the gradient (CSS color strings) */
  colors?: string[]
  /** Gradient angle in degrees (linear) or 'radial' */
  angle?: number | 'radial'
  /** Grain intensity 0–1 (opacity of the noise overlay) */
  grain?: number
  /** Unique id for the SVG filter to avoid conflicts */
  id?: string
  /** Animate gradient flow (React Bits style) */
  animated?: boolean
  /** Animation duration in seconds (when animated) */
  animationDuration?: number
  /**
   * @deprecated Unused; linear gradient mode uses `colors` instead.
   */
  blobColors?: [string, string, string]
}

/**
 * Grainient - Gradient background with grain texture (React Bits style).
 * Combines a CSS gradient with an SVG feTurbulence grain overlay.
 * When animated, uses linear gradient flow (grainient-flow) for subtle movement.
 */
export function Grainient({
  className,
  colors = ['#0F0F0F', '#1A1A1A', 'rgba(95,223,142,0.08)', '#0F0F0F'],
  angle = 135,
  grain = 0.4,
  id = 'grainient-grain',
  animated = false,
  animationDuration = 15,
}: GrainientProps) {
  const baseGradient =
    angle === 'radial'
      ? `radial-gradient(ellipse at 50% 50%, ${colors.join(', ')})`
      : `linear-gradient(${angle}deg, ${colors.join(', ')})`

  const gradientStyle = animated
    ? {
        background: baseGradient,
        backgroundSize: '400% 100%',
        animation: `grainient-flow ${animationDuration}s ease-in-out infinite`,
      }
    : { background: baseGradient }

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={gradientStyle}
      aria-hidden
    >
      {/* SVG grain overlay */}
      <div
        className="pointer-events-none absolute inset-0 mix-blend-soft-light"
        style={{ opacity: grain }}
      >
        <svg className="h-full w-full">
          <filter id={id}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="4"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#${id})`} />
        </svg>
      </div>
    </div>
  )
}
