'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

type LogoVariant = 'header' | 'footer' | 'sidebar' | 'sidebarCollapsed';

const variantClasses: Record<LogoVariant, string> = {
  header: 'h-9 w-auto',
  footer: 'h-6 w-auto',
  sidebar: 'h-7 w-auto',
  sidebarCollapsed: 'h-7 w-7 object-contain',
};

interface LogoProps {
  variant?: LogoVariant;
  className?: string;
}

/**
 * Agentmou brand logo. Use variant to control size across header, footer, and sidebar.
 * Switches between imagotipo_agentmou_dark.png (dark mode) and imagotipo_agentmou.svg (light mode).
 * Uses mounted state to avoid hydration mismatch (resolvedTheme differs between server and client).
 */
export function Logo({ variant = 'header', className }: LogoProps) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  const isCollapsed = variant === 'sidebarCollapsed';
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    setMounted(true);
  }, []);

  const src = isCollapsed
    ? '/isotipo_agentmou_32x32.png'
    : !mounted
      ? '/imagotipo_agentmou.svg'
      : isDark
        ? '/imagotipo_agentmou_dark.png'
        : '/imagotipo_agentmou.svg';

  return (
    <img
      src={src}
      alt="Agentmou"
      className={cn(variantClasses[variant], className)}
      width={isCollapsed ? 28 : undefined}
      height={isCollapsed ? 28 : undefined}
    />
  );
}
