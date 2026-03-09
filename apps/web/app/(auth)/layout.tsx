import Link from 'next/link'
import { Bot } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-foreground transition-transform group-hover:scale-105">
            <Bot className="h-4 w-4 text-background" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Agentmou</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        {children}
      </main>
    </div>
  )
}
