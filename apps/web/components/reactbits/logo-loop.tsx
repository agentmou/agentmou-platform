'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoItem {
  readonly id: string
  readonly src: string
  readonly name: string
  readonly href: string
}

interface LogoLoopProps {
  items: readonly LogoItem[]
  className?: string
  speed?: number
}

export function LogoLoop({ items, className, speed = 30 }: LogoLoopProps) {
  const doubled = [...items, ...items]

  return (
    <div
      className={cn('logo-loop-container relative overflow-hidden', className)}
      aria-label="Integration logos"
    >
      <div
        className="logo-loop-track flex w-max items-center gap-12"
        style={{ animationDuration: `${speed}s` }}
      >
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
  )
}
