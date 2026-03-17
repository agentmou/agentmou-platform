'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { cn } from '@/lib/utils'

interface FadeContentProps {
  children: React.ReactNode
  blur?: boolean
  duration?: number
  delay?: number
  threshold?: number
  initialOpacity?: number
  className?: string
  style?: React.CSSProperties
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  distance?: number
}

export function FadeContent({
  children,
  blur = false,
  duration = 0.4,
  delay = 0,
  threshold = 0.1,
  initialOpacity = 0,
  className,
  style,
  direction = 'up',
  distance = 12,
}: FadeContentProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: threshold })

  const directionOffset = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
    none: {},
  }

  return (
    <motion.div
      ref={ref}
      initial={{
        opacity: initialOpacity,
        filter: blur ? 'blur(8px)' : 'blur(0px)',
        ...directionOffset[direction],
      }}
      animate={
        isInView
          ? { opacity: 1, filter: 'blur(0px)', x: 0, y: 0 }
          : undefined
      }
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(className)}
      style={style}
    >
      {children}
    </motion.div>
  )
}
