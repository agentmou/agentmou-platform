'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun, Monitor, CheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type ThemeValue = 'light' | 'dark' | 'system'

interface ThemeToggleProps {
  variant?: 'icon' | 'dropdown'
  className?: string
}

/**
 * Theme toggle for switching between light, dark, and system preference.
 * Uses next-themes; persists selection in localStorage.
 */
export function ThemeToggle({ variant = 'icon', className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('size-8', className)}
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  const currentTheme = (theme ?? 'system') as ThemeValue
  const effectiveTheme = (resolvedTheme ?? 'light') as 'light' | 'dark'

  const Icon = effectiveTheme === 'dark' ? Moon : Sun

  const handleSelect = (value: ThemeValue) => {
    setTheme(value)
  }

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('size-8', className)}
            aria-label="Toggle theme"
          >
            <Icon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleSelect('light')}>
            <Sun className="h-4 w-4" />
            Light
            {currentTheme === 'light' && <CheckIcon className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSelect('dark')}>
            <Moon className="h-4 w-4" />
            Dark
            {currentTheme === 'dark' && <CheckIcon className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSelect('system')}>
            <Monitor className="h-4 w-4" />
            System
            {currentTheme === 'system' && <CheckIcon className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Icon variant: cycle on click (light -> dark -> system -> light)
  const cycleTheme = () => {
    const order: ThemeValue[] = ['light', 'dark', 'system']
    const idx = order.indexOf(currentTheme)
    const next = order[(idx + 1) % order.length]
    setTheme(next)
  }

  const label =
    currentTheme === 'system'
      ? 'System theme'
      : currentTheme === 'dark'
        ? 'Dark mode'
        : 'Light mode'

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('size-8', className)}
      onClick={cycleTheme}
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}
