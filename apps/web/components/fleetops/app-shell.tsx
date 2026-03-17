'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Kbd } from '@/components/ui/kbd'
import {
  LayoutDashboard,
  Store,
  Download,
  Package,
  CheckCircle,
  Eye,
  Shield,
  Settings,
  ChevronDown,
  Menu,
  Search,
  User,
  LogOut,
  Bell,
  Building2,
  UserCircle,
  PanelLeftClose,
  PanelLeft,
  Command,
} from 'lucide-react'
import { Logo } from '@/components/brand'
import { CommandPalette } from '@/components/fleetops/command-palette'
import { useAuthStore } from '@/lib/auth/store'
import { useDataProvider } from '@/lib/data'

const navSections = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/approvals', label: 'Approvals', icon: CheckCircle, badge: true },
    ],
  },
  {
    label: 'Agents',
    items: [
      { href: '/marketplace', label: 'Marketplace', icon: Store },
      { href: '/installer/new', label: 'Installer', icon: Download },
      { href: '/fleet', label: 'Fleet', icon: Package },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/runs', label: 'Runs', icon: Eye },
      { href: '/observability', label: 'Observability', icon: Eye },
    ],
  },
  {
    label: 'Security',
    items: [{ href: '/security', label: 'Security', icon: Shield }],
  },
]

interface AgentmouShellProps {
  children: React.ReactNode
}

export function FleetOpsShell({ children }: AgentmouShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const tenantId = params.tenantId as string

  const authUser = useAuthStore((s) => s.user)
  const authTenants = useAuthStore((s) => s.tenants)
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const logout = useAuthStore((s) => s.logout)
  const hydrate = useAuthStore((s) => s.hydrate)

  React.useEffect(() => { hydrate() }, [hydrate])

  const provider = useDataProvider()
  const isDemoWorkspace = tenantId === 'demo-workspace'
  const hasTenantAccess = isDemoWorkspace || authTenants.some((tenant) => tenant.id === tenantId)

  const tenants = authTenants.map((t) => ({
    id: t.id,
    name: t.name,
    type: 'business' as const,
    plan: t.plan as 'free' | 'starter' | 'pro' | 'scale' | 'enterprise',
    createdAt: '',
    ownerId: authUser?.id ?? '',
    settings: { timezone: 'UTC', defaultHITL: false, logRetentionDays: 30, memoryRetentionDays: 30 },
  }))

  const demoTenant = {
    id: 'demo-workspace',
    name: 'Demo Workspace',
    type: 'business' as const,
    plan: 'free' as const,
    createdAt: '',
    ownerId: '',
    settings: { timezone: 'UTC', defaultHITL: false, logRetentionDays: 30, memoryRetentionDays: 30 },
  }
  
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [collapsed, setCollapsed] = React.useState(false)
  const [commandOpen, setCommandOpen] = React.useState(false)
  
  // Global keyboard shortcut for command palette
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  const currentTenant = tenants.find((tenant) => tenant.id === tenantId) ||
    (isDemoWorkspace ? demoTenant : tenants[0] ?? null)

  React.useEffect(() => {
    if (isDemoWorkspace || !isHydrated) return

    if (authTenants.length === 0) {
      router.replace('/app')
      return
    }

    if (!hasTenantAccess) {
      router.replace(`/app/${authTenants[0].id}/dashboard`)
    }
  }, [isDemoWorkspace, isHydrated, authTenants, hasTenantAccess, router])

  const [pendingApprovals, setPendingApprovals] = React.useState(0)
  React.useEffect(() => {
    if (!isDemoWorkspace && (!isHydrated || !hasTenantAccess)) {
      return
    }
    provider.listTenantApprovals(tenantId).then((approvals) => {
      setPendingApprovals(approvals.filter((a) => a.status === 'pending').length)
    }).catch(() => setPendingApprovals(0))
  }, [tenantId, provider, isDemoWorkspace, isHydrated, hasTenantAccess])

  if (!isDemoWorkspace && !isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading workspace...</p>
      </div>
    )
  }

  if (!currentTenant || (!isDemoWorkspace && !hasTenantAccess)) {
    return null
  }
  
  const isActive = (href: string) => {
    const fullPath = `/app/${tenantId}${href}`
    if (href === '/dashboard') {
      return pathname === `/app/${tenantId}` || pathname === `/app/${tenantId}/dashboard`
    }
    return pathname.startsWith(fullPath)
  }
  
  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Logo + Collapse toggle (desktop) - minimal editorial */}
      <div
        role={collapsed ? "button" : undefined}
        tabIndex={collapsed ? 0 : undefined}
        aria-label={collapsed ? "Expand sidebar" : undefined}
        className={cn(
          "flex h-14 items-center border-b border-border/50 relative",
          collapsed
            ? "justify-center group cursor-pointer hover:bg-muted/30 transition-colors"
            : "justify-between gap-2 px-4"
        )}
        onClick={collapsed ? () => setCollapsed(false) : undefined}
        onKeyDown={
          collapsed
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setCollapsed(false)
                }
              }
            : undefined
        }
      >
        <Link
          href={`/app/${tenantId}/dashboard`}
          className={cn("flex items-center min-w-0 shrink-0", collapsed && "pointer-events-none")}
        >
          <Logo variant={collapsed ? "sidebarCollapsed" : "sidebar"} />
        </Link>
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 shrink-0 lg:flex"
            onClick={(e) => {
              e.stopPropagation()
              setCollapsed(true)
            }}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
        {collapsed && (
          <PanelLeft
            className="h-4 w-4 absolute opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            aria-hidden
          />
        )}
      </div>
      
      {/* Navigation - grouped by sections */}
      <ScrollArea className="flex-1 px-3 py-6">
        <nav className="flex flex-col gap-6">
          {navSections.map((section) => (
            <div key={section.label} className="flex flex-col gap-0.5">
              {!collapsed && (
                <p className="text-editorial-tiny text-muted-foreground px-3 mb-1 uppercase tracking-[0.05em]">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={`/app/${tenantId}${item.href}`}
                    className={cn(
                      "group flex items-center gap-3 rounded-sm px-3 py-2 text-[11px] uppercase tracking-[0.05em] font-medium transition-colors",
                      active
                        ? "bg-accent/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                      collapsed && "justify-center px-2"
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active
                          ? "text-accent"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && pendingApprovals > 0 && (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-sm bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                            {pendingApprovals}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>
      
      {/* Settings - outlined button at bottom (SaaS style) */}
      <div className="border-t border-border/50 p-3">
        <Link href={`/app/${tenantId}/settings`} onClick={() => setMobileOpen(false)}>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start gap-2 text-[11px] uppercase tracking-[0.05em] font-medium",
              collapsed && "justify-center px-0"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </Button>
        </Link>
      </div>
    </div>
  )
  
  return (
    <div data-surface="app" className="surface-app flex min-h-screen bg-background">
      {/* Desktop Sidebar - fixed so it stays visible on scroll */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col border-r border-border/50 bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}>
        <SidebarContent />
      </aside>
      
      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-56 p-0 bg-sidebar">
          <SidebarContent />
        </SheetContent>
      </Sheet>
      
      {/* Main Content - margin-left to avoid overlap with fixed sidebar */}
      <div className={cn(
        "flex flex-1 flex-col min-w-0",
        collapsed ? "lg:ml-16" : "lg:ml-56"
      )}>
        {/* Top Bar - minimal editorial */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border/50 bg-sidebar/95 backdrop-blur-sm px-4 lg:px-6">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          
          {/* Tenant Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 text-sm hover:text-muted-foreground transition-colors">
                {currentTenant.type === 'business' ? (
                  <Building2 className="h-4 w-4" />
                ) : (
                  <UserCircle className="h-4 w-4" />
                )}
                <span className="hidden sm:inline font-medium">{currentTenant.name}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-editorial-tiny">Switch Workspace</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tenants.map((tenant) => (
                <DropdownMenuItem key={tenant.id} asChild>
                  <Link href={`/app/${tenant.id}/dashboard`} className="flex items-center gap-2">
                    {tenant.type === 'business' ? (
                      <Building2 className="h-4 w-4" />
                    ) : (
                      <UserCircle className="h-4 w-4" />
                    )}
                    <span className="flex-1">{tenant.name}</span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {tenant.plan}
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-muted-foreground">
                <span>Create new workspace</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Global Search / Command Palette Trigger */}
          <button
            onClick={() => setCommandOpen(true)}
            className="relative flex-1 max-w-md flex items-center gap-2 h-8 px-3 text-sm text-muted-foreground bg-muted/30 border border-border/50 rounded-sm hover:bg-muted/50 transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Search...</span>
            <Kbd className="hidden sm:flex">
              <Command className="h-3 w-3" />K
            </Kbd>
          </button>
          
          <div className="flex items-center gap-1 ml-auto">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative h-8 w-8">
              <Bell className="h-4 w-4" />
              {pendingApprovals > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-accent text-[9px] font-bold text-accent-foreground flex items-center justify-center">
                  {pendingApprovals}
                </span>
              )}
            </Button>
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm">{authUser?.name ?? 'Admin User'}</span>
                    <span className="text-xs font-normal text-muted-foreground">{authUser?.email ?? 'admin@acme.com'}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/app/${tenantId}/settings`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout()
                    window.location.href = '/login'
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
      
      {/* Command Palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  )
}
