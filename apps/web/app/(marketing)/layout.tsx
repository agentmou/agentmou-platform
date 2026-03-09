'use client'

import Link from 'next/link'
import { ChatWidget } from '@/components/chat'
import { MinimalButton } from '@/components/ui/minimal-button'
import { Bot, ArrowRight } from 'lucide-react'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div data-surface="marketing" className="surface-marketing min-h-screen bg-background">
      {/* Header - minimal editorial */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-foreground transition-transform group-hover:scale-105">
              <Bot className="h-4 w-4 text-background" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Agentmou</span>
          </Link>
          
          <nav className="hidden items-center gap-8 md:flex">
            <Link 
              href="/docs" 
              className="text-editorial-tiny hover:text-foreground transition-colors"
            >
              Docs
            </Link>
            <Link 
              href="/pricing" 
              className="text-editorial-tiny hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link 
              href="/security" 
              className="text-editorial-tiny hover:text-foreground transition-colors"
            >
              Security
            </Link>
          </nav>
          
          <div className="flex items-center gap-4">
            <Link href="/login">
              <MinimalButton variant="text" size="sm" className="text-editorial-tiny">
                Sign in
              </MinimalButton>
            </Link>
            <Link href="/register">
              <MinimalButton size="sm" className="text-xs">
                Get started
                <ArrowRight className="h-3 w-3" />
              </MinimalButton>
            </Link>
          </div>
        </div>
        <div className="h-px bg-border/50" />
      </header>
      
      {/* Main content with top padding for fixed header */}
      <main className="pt-14">{children}</main>
      
      {/* Footer - minimal editorial */}
      <footer className="border-t border-border/50 mt-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-foreground">
                  <Bot className="h-3.5 w-3.5 text-background" />
                </div>
                <span className="text-sm font-semibold">Agentmou</span>
              </Link>
              <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                AI Agent Fleet + n8n Orchestration
              </p>
            </div>
            
            <div>
              <h4 className="text-editorial-tiny mb-4">Product</h4>
              <ul className="space-y-2.5">
                <li><Link href="/app/demo-workspace/marketplace" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Marketplace</Link></li>
                <li><Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="/docs" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Documentation</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-editorial-tiny mb-4">Company</h4>
              <ul className="space-y-2.5">
                <li><Link href="/security" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Security</Link></li>
                <li><span className="text-xs text-muted-foreground">About</span></li>
                <li><span className="text-xs text-muted-foreground">Blog</span></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-editorial-tiny mb-4">Resources</h4>
              <ul className="space-y-2.5">
                <li><Link href="/docs" className="text-xs text-muted-foreground hover:text-foreground transition-colors">API</Link></li>
                <li><span className="text-xs text-muted-foreground">Changelog</span></li>
                <li><span className="text-xs text-muted-foreground">Status</span></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-editorial-tiny mb-4">Legal</h4>
              <ul className="space-y-2.5">
                <li><span className="text-xs text-muted-foreground">Privacy</span></li>
                <li><span className="text-xs text-muted-foreground">Terms</span></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t border-border/30">
            <p className="text-[11px] text-muted-foreground">
              &copy; {new Date().getFullYear()} Agentmou. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      
      <ChatWidget mode="public" />
    </div>
  )
}
