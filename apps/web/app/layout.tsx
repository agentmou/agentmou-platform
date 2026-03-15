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
      { url: '/logo_agentmou_32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/logo_agentmou_32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/logo_agentmou.svg', type: 'image/svg+xml' },
    ],
    apple: '/logo_agentmou_180x180.png',
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
