'use client';

import { cn } from '@/lib/utils';

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
  /** Delay in seconds before the gradient animation starts (for staggered reading-order effect) */
  animationDelay?: number;
}

export function GradientText({
  children,
  className,
  colors = ['var(--primary)', 'var(--brand-cyan, var(--primary))', 'var(--primary)'],
  animationSpeed = 6,
  animationDelay = 0,
}: GradientTextProps) {
  const gradientColors = [...colors, colors[0]].join(', ');

  return (
    <span
      className={cn('inline-block', className)}
      style={{
        backgroundImage: `linear-gradient(to right, ${gradientColors})`,
        backgroundSize: '300% 100%',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        animation: `gradient-shift ${animationSpeed}s ease infinite alternate`,
        animationDelay: `${animationDelay}s`,
      }}
    >
      {children}
    </span>
  );
}
