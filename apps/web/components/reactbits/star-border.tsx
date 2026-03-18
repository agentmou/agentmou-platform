'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import type { CSSProperties } from 'react'

interface StarBorderProps {
  children: React.ReactNode
  as?: React.ElementType
  className?: string
  color?: string
  speed?: string
  thickness?: number
  /** Length of the light segment as % of perimeter (default 15). */
  lightLength?: number
}

/**
 * StarBorder — animated border with light traveling at constant linear speed.
 * Uses SVG stroke-dasharray/dashoffset so the light keeps fixed length and
 * moves uniformly along the full perimeter. Stroke uses a linear gradient
 * that fades at both ends for a softer look.
 */
export function StarBorder({
  as: Component = 'div',
  children,
  className,
  color = 'var(--accent)',
  speed = '6s',
  thickness = 1.5,
  lightLength = 15,
}: StarBorderProps) {
  const id = React.useId().replace(/:/g, '')
  const inset = thickness
  const gap = 100 - lightLength
  const dur = speed
  return (
    <Component
      className={cn(
        'star-border-container relative inline-grid overflow-hidden rounded-md',
        className,
      )}
      style={
        {
          padding: `${inset}px`,
        } as CSSProperties
      }
    >
      {/* SVG stroke — light travels full perimeter, gradient fades at ends */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient
            id={`star-fade-${id}`}
            gradientUnits="objectBoundingBox"
            x1="0"
            y1="0.5"
            x2="1"
            y2="0.5"
          >
            <stop offset="0" stopColor={color} stopOpacity="0" />
            <stop offset="0.02" stopColor={color} stopOpacity="0.9" />
            <stop offset="0.12" stopColor={color} stopOpacity="0.98" />
            <stop offset="0.35" stopColor={color} stopOpacity="1" />
            <stop offset="0.65" stopColor={color} stopOpacity="1" />
            <stop offset="0.85" stopColor={color} stopOpacity="0.95" />
            <stop offset="0.98" stopColor={color} stopOpacity="0.75" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
            <animateTransform
              attributeName="gradientTransform"
              type="rotate"
              from="0 0.5 0.5"
              to="360 0.5 0.5"
              dur={dur}
              repeatCount="indefinite"
            />
          </linearGradient>
        </defs>
        <rect
          x={2}
          y={2}
          width={96}
          height={96}
          rx={4}
          ry={4}
          fill="none"
          stroke={`url(#star-fade-${id})`}
          strokeWidth={2}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${lightLength} ${gap}`}
          style={{
            animation: `star-dash ${speed} linear infinite`,
          }}
        />
      </svg>
      {/* Inner area with solid bg so light shows only on border */}
      <div
        className="relative z-10 col-start-1 row-start-1 min-w-0 overflow-hidden border border-border/30 bg-[var(--card)]"
        style={{
          borderRadius: `calc(var(--radius) - ${thickness}px)`,
        }}
      >
        {children}
      </div>
    </Component>
  )
}
