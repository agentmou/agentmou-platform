'use client';

import Image from 'next/image';
import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface LogoItem {
  readonly id: string;
  readonly src: string;
  readonly name: string;
  readonly href: string;
}

interface LogoLoopProps {
  items: readonly LogoItem[];
  className?: string;
  speed?: number;
}

export function LogoLoop({ items, className, speed = 30 }: LogoLoopProps) {
  const doubled = [...items, ...items];
  const trackRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(0);
  const velocityFactorRef = useRef(1);
  const [isHovered, setIsHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let lastTime = performance.now();
    let rafId: number;

    const animate = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const trackWidth = track.scrollWidth;
      const loopWidth = trackWidth / 2;

      if (loopWidth <= 0) {
        rafId = requestAnimationFrame(animate);
        return;
      }

      const baseVelocity = prefersReducedMotion ? 0 : loopWidth / speed;
      const targetFactor = isHovered ? 0 : 1;
      const lerpRate = isHovered ? 0.05 : 0.07;
      velocityFactorRef.current += (targetFactor - velocityFactorRef.current) * lerpRate;

      const velocity = baseVelocity * velocityFactorRef.current;
      positionRef.current -= velocity * delta;

      if (positionRef.current <= -loopWidth) {
        positionRef.current += loopWidth;
      }
      if (positionRef.current > 0) {
        positionRef.current -= loopWidth;
      }

      track.style.transform = `translateX(${positionRef.current}px)`;
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [speed, isHovered, prefersReducedMotion]);

  return (
    <div
      className={cn('logo-loop-container relative overflow-hidden', className)}
      aria-label="Integration logos"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div ref={trackRef} className="logo-loop-track flex w-max items-center gap-12">
        {doubled.map((item, i) => (
          <a
            key={`${item.id}-${i}`}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center grayscale transition-all duration-300 hover:grayscale-0 opacity-60 hover:opacity-100"
          >
            <Image
              src={item.src}
              alt={item.name}
              width={120}
              height={40}
              className="h-9 w-auto object-contain"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
