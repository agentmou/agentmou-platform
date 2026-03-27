'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Shield, 
  Key, 
  Users, 
  Plus, 
  CheckCircle2,
  Lock,
  Download,
  FileQuestion,
} from 'lucide-react'
import { SpotlightCard } from '@/components/reactbits/spotlight-card'
import { formatDate } from '@/lib/utils'
import { StatusPill, IntegrationChip } from '@/components/badges'
import { useProviderQuery } from '@/lib/data/use-provider-query'
import { useDataProvider } from '@/lib/providers/context'
import { HonestSurfaceBadge, HonestSurfaceNotice } from '@/components/honest-surface'
import { resolveHonestSurfaceState } from '@/lib/honest-ui'
import type { FleetSecret, FleetAuditEvent } from '@/lib/data/provider'
import type { SecurityFinding, TenantMember } from '@agentmou/contracts'

function findingStatus(severity: SecurityFinding['severity']) {
  if (severity === 'critical' || severity === 'high') return 'error'
  if (severity === 'medium') return 'warning'
  return 'pending'
}

export default function SecurityPage() {
  const params = useParams()
  const tenantId = params.tenantId as string
  const provider = useDataProvider()
  const secretsState = resolveHonestSurfaceState('security-secrets', {
    providerMode: provider.providerMode,
    tenantId,
  })
  const teamState = resolveHonestSurfaceState('security-team', {
    providerMode: provider.providerMode,
    tenantId,
  })
  const auditState = resolveHonestSurfaceState('security-audit', {
    providerMode: provider.providerMode,
    tenantId,
  })

  const { data: auditEvents } = useProviderQuery<FleetAuditEvent[]>(
    (p) => p.listTenantAuditEvents(tenantId),
    [],
    [tenantId],
  )
  const { data: teamMembers } = useProviderQuery<TenantMember[]>(
    (p) => p.listTenantMembers(tenantId),
    [],
    [tenantId],
  )
  const { data: serverSecrets } = useProviderQuery<FleetSecret[]>(
    (p) => p.listTenantSecrets(tenantId),
    [],
    [tenantId],
  )
  const { data: findings } = useProviderQuery<SecurityFinding[]>(
    (p) => p.listTenantSecurityFindings(tenantId),
    [],
    [tenantId],
  )
  const [auditFilter, setAuditFilter] = useState('all')
  
  const filteredAuditEvents = auditFilter === 'all' 
    ? auditEvents 
    : auditEvents.filter(e => e.category === auditFilter)

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <p className="text-editorial-tiny mb-2">Security</p>
        <h1 className="text-2xl font-bold tracking-tight">Security</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage secrets, access controls, and audit logs</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Operational Findings</CardTitle>
          <CardDescription className="text-xs">
            Derived from real secrets, memberships, approvals, connectors, and audit activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {findings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No operational findings are currently derived for this workspace.
            </p>
          ) : (
            <div className="space-y-3">
              {findings.slice(0, 3).map((finding) => (
                <div key={finding.id} className="rounded-lg border border-border/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{finding.title}</p>
                    <StatusPill
                      status={findingStatus(finding.severity)}
                      label={finding.severity}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{finding.description}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="secrets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="secrets" className="gap-2">
            <Key className="h-4 w-4" />
            Secrets
          </TabsTrigger>
          <TabsTrigger value="rbac" className="gap-2">
            <Users className="h-4 w-4" />
            Team & RBAC
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <Shield className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        {/* Secrets Tab */}
        <TabsContent value="secrets" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">Secrets Manager</CardTitle>
                  <HonestSurfaceBadge state={secretsState} />
                </div>
                <CardDescription className="text-xs">API keys, tokens, and credentials used by your agents</CardDescription>
              </div>
              <Button size="sm" className="h-8 text-xs" disabled>
                <Plus className="mr-1.5 h-3 w-3" />
                Add Secret
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 p-0">
              <div className="px-6 pt-6">
                <HonestSurfaceNotice state={secretsState} />
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50 hover:bg-transparent">
                    <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30">Key</TableHead>
                    <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30">Value</TableHead>
                    <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30">Last Rotated</TableHead>
                    <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30">Used By</TableHead>
                    <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serverSecrets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-16">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                            <FileQuestion className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-foreground mb-1">No secrets to display</p>
                          <p className="text-xs text-muted-foreground">{secretsState.description}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    serverSecrets.map(secret => (
                      <TableRow key={secret.id} className="border-b border-border/30 h-[52px] hover:bg-muted/20">
                        <TableCell className="font-mono text-xs">{secret.key}</TableCell>
                        <TableCell>
                          <code className="rounded bg-muted/50 px-2 py-1 text-[10px] font-mono">
                            ••••••••••••
                          </code>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(secret.lastRotated).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {secret.usedBy.length > 0 ? (
                            <div className="flex gap-1">
                              {secret.usedBy.slice(0, 2).map(agent => (
                                <IntegrationChip key={agent} name={agent} />
                              ))}
                              {secret.usedBy.length > 2 && (
                                <IntegrationChip name={`+${secret.usedBy.length - 2}`} />
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not in use</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <HonestSurfaceBadge state={secretsState} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RBAC Tab */}
        <TabsContent value="rbac" className="space-y-4">
          <HonestSurfaceNotice state={teamState} />
          <SpotlightCard>
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <CardDescription className="text-xs">Manage who has access to your workspace</CardDescription>
              </div>
              <Button size="sm" className="h-8 text-xs" disabled>
                <Plus className="mr-1.5 h-3 w-3" />
                Invite Member
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50 hover:bg-transparent">
                    <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30">Member</TableHead>
                    <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30">Role</TableHead>
                    <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30">Status</TableHead>
                    <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30">Last Active</TableHead>
                    <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map(member => (
                    <TableRow key={member.id} className="border-b border-border/30 h-[52px] hover:bg-muted/20">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-medium">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{member.name}</p>
                            <p className="text-[10px] text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select value={member.role} disabled>
                          <SelectTrigger className="w-28 h-7 text-xs border-border/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner" className="text-xs">Owner</SelectItem>
                            <SelectItem value="admin" className="text-xs">Admin</SelectItem>
                            <SelectItem value="operator" className="text-xs">Operator</SelectItem>
                            <SelectItem value="viewer" className="text-xs">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <StatusPill 
                          status="active"
                          label="active"
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(member.lastActiveAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" disabled>
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          </SpotlightCard>

          <SpotlightCard>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Permission Matrix</CardTitle>
              <CardDescription className="text-xs">Overview of role permissions</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50 hover:bg-transparent">
                    <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30">Permission</TableHead>
                    <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30 text-center">Viewer</TableHead>
                    <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30 text-center">Editor</TableHead>
                    <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30 text-center">Admin</TableHead>
                    <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30 text-center">Owner</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { name: 'View dashboard', viewer: true, editor: true, admin: true, owner: true },
                    { name: 'View runs', viewer: true, editor: true, admin: true, owner: true },
                    { name: 'Install agents', viewer: false, editor: true, admin: true, owner: true },
                    { name: 'Approve actions', viewer: false, editor: true, admin: true, owner: true },
                    { name: 'Manage secrets', viewer: false, editor: false, admin: true, owner: true },
                    { name: 'Manage team', viewer: false, editor: false, admin: true, owner: true },
                    { name: 'Billing & settings', viewer: false, editor: false, admin: false, owner: true },
                  ].map(perm => (
                    <TableRow key={perm.name} className="border-b border-border/30 h-[44px] hover:bg-transparent">
                      <TableCell className="text-sm">{perm.name}</TableCell>
                      <TableCell className="text-center">
                        {perm.viewer ? <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-accent" /> : <Lock className="mx-auto h-3.5 w-3.5 text-muted-foreground/40" />}
                      </TableCell>
                      <TableCell className="text-center">
                        {perm.editor ? <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-accent" /> : <Lock className="mx-auto h-3.5 w-3.5 text-muted-foreground/40" />}
                      </TableCell>
                      <TableCell className="text-center">
                        {perm.admin ? <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-accent" /> : <Lock className="mx-auto h-3.5 w-3.5 text-muted-foreground/40" />}
                      </TableCell>
                      <TableCell className="text-center">
                        {perm.owner ? <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-accent" /> : <Lock className="mx-auto h-3.5 w-3.5 text-muted-foreground/40" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          </SpotlightCard>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-4">
          <HonestSurfaceNotice state={auditState} />
          <SpotlightCard>
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Audit Log</CardTitle>
                <CardDescription className="text-xs">Complete history of actions in your workspace</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={auditFilter} onValueChange={setAuditFilter} disabled={auditState.disabled}>
                  <SelectTrigger className="w-36 h-8 text-xs border-border/50">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Events</SelectItem>
                    <SelectItem value="agent" className="text-xs">Agent Events</SelectItem>
                    <SelectItem value="workflow" className="text-xs">Workflow Events</SelectItem>
                    <SelectItem value="security" className="text-xs">Security Events</SelectItem>
                    <SelectItem value="billing" className="text-xs">Billing Events</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="h-8 text-xs" disabled>
                  <Download className="mr-1.5 h-3 w-3" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50 hover:bg-transparent">
                    <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30">Timestamp</TableHead>
                    <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30">Event</TableHead>
                    <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30">Actor</TableHead>
                    <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30">Category</TableHead>
                    <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAuditEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                        {auditState.description}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAuditEvents.map(event => (
                      <TableRow key={event.id} className="border-b border-border/30 h-[52px] hover:bg-muted/20">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(event.timestamp)}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{event.action}</TableCell>
                        <TableCell className="text-sm">{event.actor}</TableCell>
                        <TableCell>
                          <IntegrationChip name={event.category} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {event.details}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          </SpotlightCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
