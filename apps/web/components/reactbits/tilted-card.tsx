'use client';

import { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface TiltedCardProps {
  children: React.ReactNode;
  className?: string;
  /** Max tilt angle in degrees (default 3 for very subtle effect) */
  tiltIntensity?: number;
  /** Scale on hover (default 1.005 for very subtle) */
  scaleOnHover?: number;
}

/**
 * TiltedCard - Subtle 3D tilt effect on mouse move (React Bits style)
 */
export function TiltedCard({
  children,
  className,
  tiltIntensity = 1,
  scaleOnHover = 1.002,
}: TiltedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const rotateX = -y * tiltIntensity;
      const rotateY = x * tiltIntensity;
      setTransform(
        `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scaleOnHover}, ${scaleOnHover}, ${scaleOnHover})`
      );
      setIsHovered(true);
    },
    [tiltIntensity, scaleOnHover]
  );

  const handleMouseLeave = useCallback(() => {
    setTransform('');
    setIsHovered(false);
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn('transition-transform duration-200 ease-out', className)}
      style={{
        transform: isHovered ? transform : undefined,
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
    </div>
  );
}
