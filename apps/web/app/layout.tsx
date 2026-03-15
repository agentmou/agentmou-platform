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
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
