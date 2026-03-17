import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Agentmou - AI Agent Fleet + n8n Orchestration',
  description: 'Install AI agents for sales, support, finance, and ops. Connect your tools. Automate with n8n workflows.',
  icons: {
    icon: [
      { url: '/isotipo_agentmou_32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/isotipo_agentmou_32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/isotipo_agentmou.svg', type: 'image/svg+xml' },
    ],
    apple: '/isotipo_agentmou_180x180.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden>
          <defs>
            <filter id="mint-filter" colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values="0 0 0 0 0.24 0 0 0 0 1 0 0 0 0 0.63 0 0 0 1 0" />
            </filter>
          </defs>
        </svg>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
