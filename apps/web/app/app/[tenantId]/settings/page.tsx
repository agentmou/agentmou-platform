'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SpotlightCard } from '@/components/reactbits/spotlight-card';
import {
  Building2,
  Bell,
  CreditCard,
  Trash2,
  AlertTriangle,
  ExternalLink,
  Download,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { useProviderQuery } from '@/lib/data/use-provider-query';
import { useDataProvider } from '@/lib/providers/context';
import { HonestSurfaceBadge, HonestSurfaceNotice } from '@/components/honest-surface';
import { resolveHonestSurfaceState } from '@/lib/honest-ui';
import type { FleetBillingInfo } from '@/lib/data/provider';
import type { Invoice, N8nConnection, Tenant } from '@agentmou/contracts';

function formatInvoiceMonth(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date));
}

function SettingsPageContent() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const provider = useDataProvider();
  const generalState = resolveHonestSurfaceState('settings-general', {
    providerMode: provider.providerMode,
    tenantId,
  });
  const notificationsState = resolveHonestSurfaceState('settings-notifications', {
    providerMode: provider.providerMode,
    tenantId,
  });
  const billingState = resolveHonestSurfaceState('settings-billing', {
    providerMode: provider.providerMode,
    tenantId,
  });
  const dangerZoneState = resolveHonestSurfaceState('settings-danger-zone', {
    providerMode: provider.providerMode,
    tenantId,
  });
  const n8nState = resolveHonestSurfaceState('n8n-connection', {
    providerMode: provider.providerMode,
    tenantId,
  });

  const tenantFallback = {
    id: tenantId,
    name: '',
    type: 'business' as const,
    plan: 'starter' as const,
    createdAt: '',
    ownerId: '',
    settings: {
      timezone: 'America/New_York',
      defaultHITL: false,
      logRetentionDays: 30,
      memoryRetentionDays: 7,
    },
  } as Tenant;
  const { data: tenantData } = useProviderQuery<Tenant | null>(
    (p) => p.getTenant(tenantId),
    tenantFallback,
    [tenantId]
  );
  const tenant = tenantData ?? tenantFallback;
  const { data: billing } = useProviderQuery<FleetBillingInfo>(
    (p) => p.getTenantBillingInfo(tenantId),
    { plan: 'starter', monthlySpend: 0, agentsInstalled: 0, runsThisMonth: 0 },
    [tenantId]
  );
  const { data: invoices } = useProviderQuery<Invoice[]>(
    (p) => p.listTenantInvoices(tenantId),
    [],
    [tenantId]
  );
  const { data: n8nConnection } = useProviderQuery<N8nConnection | null>(
    (p) => p.getTenantN8nConnection(tenantId),
    null,
    [tenantId]
  );

  const [workspaceName, setWorkspaceName] = useState(tenant.name);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [slackNotifications, setSlackNotifications] = useState(true);
  const [runAlerts, setRunAlerts] = useState(true);
  const [approvalAlerts, setApprovalAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [timezone, setTimezone] = useState('America/New_York');
  const { theme, setTheme } = useTheme();
  const showRealBilling = provider.providerMode === 'api';

  useEffect(() => {
    setWorkspaceName(tenant.name);
    setTimezone(tenant.settings.timezone);
  }, [tenant.name, tenant.settings.timezone]);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <p className="text-editorial-tiny mb-2">Settings</p>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your workspace preferences and billing
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Building2 className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="danger" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-4">
          <HonestSurfaceNotice state={generalState} />
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Workspace Settings</CardTitle>
                <HonestSurfaceBadge state={generalState} />
              </div>
              <CardDescription>Basic configuration for your workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Workspace Name</Label>
                <Input
                  id="name"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Workspace URL</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">agentmou.io/app/</span>
                  <Input id="slug" value={tenant.id} className="max-w-xs" disabled />
                </div>
                <p className="text-xs text-muted-foreground">
                  Contact support to change your workspace URL
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone} disabled>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select value={theme ?? 'system'} onValueChange={(v) => setTheme(v)}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <span className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Light
                      </span>
                    </SelectItem>
                    <SelectItem value="dark">
                      <span className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Dark
                      </span>
                    </SelectItem>
                    <SelectItem value="system">
                      <span className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        System
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Appearance of the interface</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Workspace ID</Label>
                <code className="block rounded bg-muted px-3 py-2 text-sm">{tenant.id}</code>
                <p className="text-xs text-muted-foreground">Use this ID for API integrations</p>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button disabled>Save Changes</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Workflow Engine</CardTitle>
                <HonestSurfaceBadge state={n8nState} />
              </div>
              <CardDescription>
                Status of the internal workflow engine that powers installed workflows.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <HonestSurfaceNotice state={n8nState} />
              {n8nConnection ? (
                <div className="rounded-lg border border-border/50 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Base URL</span>
                    <span className="font-medium">{n8nConnection.baseUrl}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Availability</span>
                    <span className="font-medium capitalize">
                      {n8nConnection.availability ?? 'unknown'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">API key</span>
                    <span className="font-medium">
                      {n8nConnection.apiKeySet ? 'Configured' : 'Not set'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Installed workflows</span>
                    <span className="font-medium">
                      {formatNumber(n8nConnection.installedWorkflows ?? 0)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Executions</span>
                    <span className="font-medium">
                      {formatNumber(n8nConnection.executionCount)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Last execution</span>
                    <span className="font-medium">
                      {n8nConnection.lastExecutionAt
                        ? new Date(n8nConnection.lastExecutionAt).toLocaleString()
                        : 'No executions yet'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                  Agentmou manages the workflow engine internally for authenticated workspaces
                  today.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <HonestSurfaceNotice state={notificationsState} />
          <SpotlightCard>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Notification Preferences</CardTitle>
                  <HonestSurfaceBadge state={notificationsState} />
                </div>
                <CardDescription>Control how and when you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Channels</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                      disabled
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Slack Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications in Slack
                      </p>
                    </div>
                    <Switch
                      checked={slackNotifications}
                      onCheckedChange={setSlackNotifications}
                      disabled
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Alert Types</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Run Failures</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when agent runs fail
                      </p>
                    </div>
                    <Switch checked={runAlerts} onCheckedChange={setRunAlerts} disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Approval Requests</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when actions need approval
                      </p>
                    </div>
                    <Switch checked={approvalAlerts} onCheckedChange={setApprovalAlerts} disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Weekly Digest</p>
                      <p className="text-sm text-muted-foreground">
                        Receive a weekly summary of activity
                      </p>
                    </div>
                    <Switch checked={weeklyDigest} onCheckedChange={setWeeklyDigest} disabled />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button disabled>Save Preferences</Button>
              </CardFooter>
            </Card>
          </SpotlightCard>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <HonestSurfaceNotice state={billingState} />
          <div className="grid gap-4 md:grid-cols-2">
            <SpotlightCard>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle>Current Plan</CardTitle>
                    <HonestSurfaceBadge state={billingState} />
                  </div>
                  <CardDescription>Your subscription details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold capitalize">{tenant.plan}</p>
                      <p className="text-muted-foreground">
                        {billingState.tone === 'demo' || showRealBilling
                          ? `$${billing.monthlySpend.toFixed(2)}/month`
                          : 'Billing provider not configured'}
                      </p>
                    </div>
                    <HonestSurfaceBadge state={billingState} />
                  </div>
                  <Separator />
                  {billingState.tone === 'demo' || showRealBilling ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Agents installed</span>
                        <span>{billing.agentsInstalled}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Runs this month</span>
                        <span>{formatNumber(billing.runsThisMonth)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Included runs</span>
                        <span>
                          {billing.includedRuns === null || billing.includedRuns === undefined
                            ? 'Unlimited'
                            : formatNumber(billing.includedRuns)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Overage runs</span>
                        <span>{formatNumber(billing.overageRuns ?? 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Overage amount</span>
                        <span>
                          ${(billing.overageAmount ?? 0).toFixed(2)}{' '}
                          {billing.currency?.toUpperCase() ?? 'USD'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Status</span>
                        <span className="capitalize">
                          {billing.subscriptionStatus ?? 'not configured'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Current period end</span>
                        <span>
                          {billing.currentPeriodEnd
                            ? new Date(billing.currentPeriodEnd).toLocaleDateString()
                            : 'Not available'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Billing limits, spend, and invoice totals remain hidden until the billing
                      surface is wired to real tenant data.
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" disabled>
                    Upgrade Plan
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </SpotlightCard>

            <SpotlightCard>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle>Payment Method</CardTitle>
                    <HonestSurfaceBadge state={billingState} />
                  </div>
                  <CardDescription>Your billing information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {billing.paymentMethodSummary ? (
                    <div className="rounded-lg border border-border/50 p-4 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Default method</span>
                        <span className="font-medium">{billing.paymentMethodSummary}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                      {billingState.tone === 'demo'
                        ? 'Demo billing details stay read-only in the sample workspace.'
                        : 'No payment method is available yet for this tenant or billing provider.'}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" disabled>
                    Update Payment Method
                  </Button>
                </CardFooter>
              </Card>
            </SpotlightCard>
          </div>

          <SpotlightCard>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Invoices</CardTitle>
                  <HonestSurfaceBadge state={billingState} />
                </div>
                <CardDescription>Download your past invoices</CardDescription>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                    {billingState.description}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{formatInvoiceMonth(invoice.date)}</span>
                          <Badge variant="secondary">{invoice.status}</Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">
                            ${invoice.amount.toFixed(2)}
                          </span>
                          <Button variant="ghost" size="sm" disabled>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </SpotlightCard>
        </TabsContent>

        {/* Danger Zone Tab */}
        <TabsContent value="danger" className="space-y-4">
          <HonestSurfaceNotice state={dangerZoneState} />
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Actions in this section are irreversible. Please proceed with caution.
            </AlertDescription>
          </Alert>

          <SpotlightCard>
            <Card className="border-destructive">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Delete Workspace</CardTitle>
                  <HonestSurfaceBadge state={dangerZoneState} />
                </div>
                <CardDescription>
                  Permanently delete this workspace and all its data, including agents, workflows,
                  runs, and configurations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  This action cannot be undone. All team members will lose access, and all data will
                  be permanently deleted.
                </p>
                <Button variant="destructive" disabled>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Workspace
                </Button>
              </CardContent>
            </Card>
          </SpotlightCard>

          <SpotlightCard>
            <Card className="border-destructive">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Export Data</CardTitle>
                  <HonestSurfaceBadge state={dangerZoneState} />
                </div>
                <CardDescription>Download all your workspace data before deletion.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" disabled>
                  <Download className="mr-2 h-4 w-4" />
                  Export All Data
                </Button>
              </CardContent>
            </Card>
          </SpotlightCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsPageContent />;
}
