'use client'

import { cn } from '@/lib/utils'

interface HalftoneIllustrationProps {
  type?: 'robot' | 'robot-head' | 'ai-device'
  className?: string
  opacity?: number
}

/**
 * HalftoneIllustration - Dot-based SVG illustrations
 * 
 * Monochrome with minimal mint accents (2-3 dots max)
 * Designed to be partially clipped/cropped for editorial effect
 */
export function HalftoneIllustration({
  type = 'robot',
  className,
  opacity = 0.12,
}: HalftoneIllustrationProps) {
  // Full robot - dot matrix construction
  if (type === 'robot') {
    return (
      <svg
        viewBox="0 0 320 440"
        className={cn('w-full h-auto', className)}
        style={{ opacity }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Head dome - gradient density dots */}
        <g fill="currentColor">
          {/* Top curve */}
          {Array.from({ length: 6 }).map((_, i) => (
            <circle key={`dome-1-${i}`} cx={120 + i * 16} cy={32} r={2.5} opacity={0.5 + i * 0.05} />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <circle key={`dome-2-${i}`} cx={104 + i * 16} cy={48} r={3} opacity={0.55 + i * 0.03} />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <circle key={`dome-3-${i}`} cx={88 + i * 16} cy={64} r={3.5} opacity={0.6 - Math.abs(i - 5) * 0.03} />
          ))}
          
          {/* Face plate - denser dots */}
          {Array.from({ length: 5 }).map((_, row) =>
            Array.from({ length: 12 - row }).map((_, col) => (
              <circle
                key={`face-${row}-${col}`}
                cx={80 + row * 6 + col * 16}
                cy={80 + row * 14}
                r={3.5 - row * 0.2}
                opacity={0.65 - row * 0.08 - Math.abs(col - 6) * 0.02}
              />
            ))
          )}
          
          {/* Eyes - solid circles */}
          <circle cx={128} cy={100} r={10} opacity={0.85} />
          <circle cx={192} cy={100} r={10} opacity={0.85} />
        </g>
        
        {/* Eye highlights - mint accent (only 2!) */}
        <g fill="#5FDF8E">
          <circle cx={128} cy={100} r={4.5} />
          <circle cx={192} cy={100} r={4.5} />
        </g>
        
        {/* Neck section */}
        <g fill="currentColor">
          {Array.from({ length: 3 }).map((_, i) => (
            <circle key={`neck-${i}`} cx={144 + i * 16} cy={160} r={2.5} opacity={0.4} />
          ))}
          {Array.from({ length: 4 }).map((_, i) => (
            <circle key={`neck2-${i}`} cx={136 + i * 16} cy={172} r={2} opacity={0.35} />
          ))}
        </g>
        
        {/* Body - torso with decreasing density */}
        <g fill="currentColor">
          {/* Shoulders - wide row */}
          {Array.from({ length: 14 }).map((_, i) => (
            <circle 
              key={`shoulder-${i}`} 
              cx={56 + i * 16} 
              cy={192} 
              r={3.5} 
              opacity={0.5 - Math.abs(i - 7) * 0.025} 
            />
          ))}
          
          {/* Torso grid */}
          {Array.from({ length: 6 }).map((_, row) =>
            Array.from({ length: 12 - row }).map((_, col) => (
              <circle
                key={`torso-${row}-${col}`}
                cx={72 + row * 4 + col * 16}
                cy={208 + row * 18}
                r={3 - row * 0.25}
                opacity={0.45 - row * 0.05 - Math.abs(col - 6) * 0.02}
              />
            ))
          )}
        </g>
        
        {/* Arms - vertical dot lines */}
        <g fill="currentColor">
          {/* Left arm */}
          {Array.from({ length: 8 }).map((_, i) => (
            <circle 
              key={`larm-${i}`} 
              cx={48 - i * 4} 
              cy={200 + i * 22} 
              r={2.5 - i * 0.15} 
              opacity={0.35 - i * 0.03} 
            />
          ))}
          {/* Right arm */}
          {Array.from({ length: 8 }).map((_, i) => (
            <circle 
              key={`rarm-${i}`} 
              cx={272 + i * 4} 
              cy={200 + i * 22} 
              r={2.5 - i * 0.15} 
              opacity={0.35 - i * 0.03} 
            />
          ))}
        </g>
        
        {/* Chest core indicator - mint accent */}
        <g fill="#5FDF8E">
          <circle cx={160} cy={232} r={5} opacity={0.7} />
        </g>
      </svg>
    )
  }

  // Robot head closeup - concentric rings with pre-calculated positions to avoid hydration issues
  if (type === 'robot-head') {
    // Pre-calculate positions to avoid floating point precision issues during SSR/client hydration
    const outerRing = [
      { x: 185, y: 100 }, { x: 175.1, y: 132.6 }, { x: 152.4, y: 160.1 }, { x: 119.5, y: 177.8 },
      { x: 80.5, y: 177.8 }, { x: 47.6, y: 160.1 }, { x: 24.9, y: 132.6 }, { x: 15, y: 100 },
      { x: 24.9, y: 67.4 }, { x: 47.6, y: 39.9 }, { x: 80.5, y: 22.2 }, { x: 119.5, y: 22.2 },
      { x: 152.4, y: 39.9 }, { x: 175.1, y: 67.4 }, { x: 185, y: 100 }, { x: 175.1, y: 132.6 }
    ]
    const midRing = [
      { x: 165, y: 100 }, { x: 156.5, y: 132.5 }, { x: 132.5, y: 156.5 }, { x: 100, y: 165 },
      { x: 67.5, y: 156.5 }, { x: 43.5, y: 132.5 }, { x: 35, y: 100 }, { x: 43.5, y: 67.5 },
      { x: 67.5, y: 43.5 }, { x: 100, y: 35 }, { x: 132.5, y: 43.5 }, { x: 156.5, y: 67.5 }
    ]
    const innerRing = [
      { x: 142, y: 100 }, { x: 129.7, y: 129.7 }, { x: 100, y: 142 }, { x: 70.3, y: 129.7 },
      { x: 58, y: 100 }, { x: 70.3, y: 70.3 }, { x: 100, y: 58 }, { x: 129.7, y: 70.3 }
    ]

    return (
      <svg
        viewBox="0 0 200 200"
        className={cn('w-full h-auto', className)}
        style={{ opacity }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g fill="currentColor">
          {/* Outer ring */}
          {outerRing.slice(0, 16).map((pos, i) => (
            <circle key={`r1-${i}`} cx={pos.x} cy={pos.y} r={2.5} opacity={0.25} />
          ))}
          
          {/* Mid ring */}
          {midRing.map((pos, i) => (
            <circle key={`r2-${i}`} cx={pos.x} cy={pos.y} r={3} opacity={0.35} />
          ))}
          
          {/* Inner ring */}
          {innerRing.map((pos, i) => (
            <circle key={`r3-${i}`} cx={pos.x} cy={pos.y} r={4} opacity={0.5} />
          ))}
          
          {/* Eyes */}
          <circle cx={80} cy={90} r={14} opacity={0.75} />
          <circle cx={120} cy={90} r={14} opacity={0.75} />
          
          {/* Mouth bar */}
          {[72, 86, 100, 114, 128].map((cx, i) => (
            <circle key={`mouth-${i}`} cx={cx} cy={130} r={3} opacity={0.4} />
          ))}
        </g>
        
        {/* Eye pupils - mint */}
        <g fill="#5FDF8E">
          <circle cx={80} cy={90} r={6} />
          <circle cx={120} cy={90} r={6} />
        </g>
      </svg>
    )
  }

  // AI Device - processor grid
  return (
    <svg
      viewBox="0 0 200 200"
      className={cn('w-full h-auto', className)}
      style={{ opacity }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g fill="currentColor">
        {/* Grid of dots - processor look */}
        {Array.from({ length: 8 }).map((_, row) =>
          Array.from({ length: 8 }).map((_, col) => {
            const distFromCenter = Math.sqrt(Math.pow(row - 3.5, 2) + Math.pow(col - 3.5, 2))
            const baseOpacity = 0.55 - distFromCenter * 0.06
            const size = 3.5 - distFromCenter * 0.2
            return (
              <circle
                key={`grid-${row}-${col}`}
                cx={40 + col * 17}
                cy={40 + row * 17}
                r={Math.max(size, 1.5)}
                opacity={Math.max(baseOpacity, 0.15)}
              />
            )
          })
        )}
        
        {/* Corner connectors */}
        {[
          [25, 100], [175, 100], [100, 25], [100, 175]
        ].map(([x, y], i) => (
          <circle key={`conn-${i}`} cx={x} cy={y} r={2} opacity={0.3} />
        ))}
      </g>
      
      {/* Center core - mint */}
      <g fill="#5FDF8E">
        <circle cx={100} cy={100} r={6} opacity={0.8} />
      </g>
    </svg>
  )
}
