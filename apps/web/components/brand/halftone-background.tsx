'use client';

import { cn } from '@/lib/utils';

interface HalftoneBackgroundProps {
  className?: string;
  variant?: 'mint' | 'charcoalVignette' | 'mintTop';
  intensity?: 'low' | 'med' | 'high';
  children?: React.ReactNode;
}

/** SVG data URI for a fine 4-pointed star — isolated, crisp edges */
function starPatternDataUri(r: number, g: number, b: number, a: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" shape-rendering="crispEdges"><path fill="rgba(${r},${g},${b},${a})" d="M7 1 L8 6 L12 7 L8 8 L7 13 L6 8 L2 7 L6 6 Z"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * HalftoneBackground - Brand signature star pattern with gradient
 *
 * Variants:
 * - mint: Mint stars concentrated at bottom, fading upward
 * - mintTop: Mint stars at top, fading downward
 * - charcoalVignette: Soft gray vignette at bottom
 *
 * Intensity controls pattern size, opacity, and gradient spread
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
    high: { dotSize: 10, dotOpacity: 0.1, glowOpacity: 0.07, spread: '75%' },
  };

  const config = intensityConfig[intensity];

  // Mint gradient (bottom to top)
  if (variant === 'mint') {
    return (
      <div className={cn('relative overflow-hidden', className)}>
        {/* Star pattern - mint, concentrated at bottom (no mask = sharp) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: starPatternDataUri(95, 223, 142, config.dotOpacity),
            backgroundSize: `${config.dotSize}px ${config.dotSize}px`,
            imageRendering: 'crisp-edges',
          }}
        />
        {/* Gradient overlay — fades stars without blurring them */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(to top, var(--halftone-base) 0%, transparent ${config.spread})`,
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
    );
  }

  // Mint gradient from top
  if (variant === 'mintTop') {
    return (
      <div className={cn('relative overflow-hidden', className)}>
        {/* Star pattern - mintTop (no mask = sharp) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: starPatternDataUri(95, 223, 142, config.dotOpacity),
            backgroundSize: `${config.dotSize}px ${config.dotSize}px`,
            imageRendering: 'crisp-edges',
          }}
        />
        {/* Gradient overlay at bottom — fades stars downward; extends further up */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(to top, var(--halftone-base) 0%, transparent 85%)`,
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
    );
  }

  // Charcoal vignette (bottom)
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Charcoal star pattern (no mask = sharp) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: starPatternDataUri(17, 17, 17, config.dotOpacity * 0.6),
          backgroundSize: `${config.dotSize}px ${config.dotSize}px`,
          imageRendering: 'crisp-edges',
        }}
      />
      {/* Gradient overlay — fades stars without blurring them */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(to top, var(--halftone-base) 0%, transparent 30%)`,
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
  );
}
