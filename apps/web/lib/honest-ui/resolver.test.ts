import { describe, expect, it } from 'vitest'

import { resolveHonestSurfaceState } from './resolver'

describe('resolveHonestSurfaceState', () => {
  it('returns preview chat guidance for authenticated tenants', () => {
    const state = resolveHonestSurfaceState('chat-assistant', {
      providerMode: 'api',
      tenantId: 'tenant-acme',
    })

    expect(state.tone).toBe('preview')
    expect(state.label).toBe('Preview')
    expect(state.description).toContain('curated product knowledge')
  })

  it('returns demo states for demo workspaces even when provider mode is api', () => {
    const state = resolveHonestSurfaceState('command-palette-quick-actions', {
      providerMode: 'api',
      tenantId: 'demo-workspace',
    })

    expect(state.tone).toBe('demo')
    expect(state.label).toBe('Demo')
    expect(state.description).toContain('navigate or simulate')
  })

  it('keeps dashboard metrics visibly previewed without disabling the cards', () => {
    const state = resolveHonestSurfaceState('dashboard-metrics', {
      providerMode: 'api',
      tenantId: 'tenant-acme',
    })

    expect(state.tone).toBe('preview')
    expect(state.disabled).toBe(false)
  })
})
