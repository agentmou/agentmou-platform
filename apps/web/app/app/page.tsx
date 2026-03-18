'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth/store'

/**
 * /app entry point — redirects authenticated users to their first tenant dashboard.
 * Falls back to demo-workspace for unauthenticated visits (proxy will redirect
 * to /login if there's no token cookie, so this only runs for logged-in users).
 */
export default function AppPage() {
  const router = useRouter()
  const hydrate = useAuthStore((s) => s.hydrate)
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const activeTenantId = useAuthStore((s) => s.activeTenantId)

  useEffect(() => { hydrate() }, [hydrate])

  useEffect(() => {
    if (!isHydrated) return
    const target = activeTenantId || 'demo-workspace'
    router.replace(`/app/${target}/dashboard`)
  }, [isHydrated, activeTenantId, router])

  return null
}
