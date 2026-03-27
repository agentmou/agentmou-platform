'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { useAgentmouAnimation } from './use-agentmou-animation';

interface AgentmouBotAnimationProps {
  className?: string;
}

/**
 * Agentmou Bot Animation — interactive spring-physics animation.
 * Replaces halftone illustration in Pre-built workflows section.
 * Triggered on hover; respects prefers-reduced-motion.
 */
export function AgentmouBotAnimation({ className }: AgentmouBotAnimationProps) {
  const charRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLImageElement>(null);

  useAgentmouAnimation(charRef, spotRef);

  return (
    <div
      className={cn('agentmou-container overflow-visible', className)}
      style={{ perspective: 900 }}
    >
      <div ref={charRef} className="agentmou-wrapper" id="agentmou-char">
        <img
          className="bot-img"
          src="/isotipo_agentmou.png"
          alt="Agentmou Bot"
          width={560}
          height={560}
        />
        <img
          ref={spotRef}
          id="spotImg"
          className="spot-img"
          src="/isotipo_agentmou.png"
          alt=""
          width={560}
          height={560}
        />
      </div>
    </div>
  );
}
