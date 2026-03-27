'use client';

import { cn } from '@/lib/utils';
import { HalftoneBackground } from './halftone-background';
import { HalftoneIllustration } from './halftone-illustration';

interface BrandFrameProps {
  children: React.ReactNode;
  className?: string;
  surface?: 'marketing' | 'app';
  density?: 'low' | 'med' | 'high';
  illustration?: 'robot' | 'robot-head' | 'ai-device' | 'none';
  illustrationPosition?: 'right' | 'left' | 'center';
}

/**
 * BrandFrame - Wrapper that positions halftone background + illustration
 *
 * - marketing: Full brand expression (density med/high)
 * - app: Subtle touches only (density low, restricted usage)
 */
export function BrandFrame({
  children,
  className,
  surface = 'marketing',
  density = 'med',
  illustration = 'none',
  illustrationPosition = 'right',
}: BrandFrameProps) {
  // In app surface, force low density
  const effectiveDensity = surface === 'app' ? 'low' : density;

  // In app surface, reduce illustration opacity further
  const illustrationOpacity = surface === 'app' ? 0.06 : 0.1;

  const illustrationPositionClasses = {
    right: 'right-0 translate-x-1/4',
    left: 'left-0 -translate-x-1/4',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <HalftoneBackground
      variant="mint"
      intensity={effectiveDensity}
      className={cn('relative', className)}
    >
      {/* Illustration overlay */}
      {illustration !== 'none' && (
        <div
          className={cn(
            'pointer-events-none absolute top-0 bottom-0 w-1/2 max-w-md flex items-center overflow-hidden',
            illustrationPositionClasses[illustrationPosition]
          )}
        >
          <HalftoneIllustration
            type={illustration}
            opacity={illustrationOpacity}
            className="w-full"
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </HalftoneBackground>
  );
}

/**
 * BrandStrip - Minimal header band with halftone
 * For use in app pages where full brand frame is too much
 */
export function BrandStrip({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Very subtle mint dots at top */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(95, 223, 142, 0.03) 1px, transparent 1px)`,
          backgroundSize: '16px 16px',
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
        }}
      />

      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
