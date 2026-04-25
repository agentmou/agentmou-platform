'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, ToasterProps } from 'sonner';

/**
 * Sonner Toaster wired to the Claude-Design prototype's .toast styles.
 *
 * Sonner exposes per-type slots (`success`, `info`, `warning`, `error`)
 * which we tag with the prototype's colored-left-border classes. The
 * default body is rendered with .toast for the shared shadow/padding/
 * radius. CSS for these classes lives in apps/web/app/app/app.css and
 * is loaded only on the /app/* surface, so marketing toasts retain
 * shadcn defaults.
 */
const Toaster = ({ toastOptions, ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        ...toastOptions,
        classNames: {
          toast: 'toast',
          success: 'toast-success',
          info: 'toast-info',
          warning: 'toast-warn',
          error: 'toast-error',
          ...(toastOptions?.classNames ?? {}),
        },
      }}
      style={
        {
          '--normal-bg': 'var(--card)',
          '--normal-text': 'var(--foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
