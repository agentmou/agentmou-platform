'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Settings, 
  Building2, 
  Bell, 
  CreditCard, 
  Trash2,
  AlertTriangle,
  Check,
  ExternalLink,
  Download,
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { useProviderQuery } from '@/lib/data/use-provider-query'
import type { FleetBillingInfo } from '@/lib/fleetops/read-model'
import type { Tenant } from '@agentmou/contracts'

export default function SettingsPage() {
  const params = useParams()
  const tenantId = params.tenantId as string

  const tenantFallback = { id: tenantId, name: '', type: 'business' as const, plan: 'starter' as const, createdAt: '', ownerId: '', settings: { timezone: 'America/New_York', defaultHITL: false, logRetentionDays: 30, memoryRetentionDays: 7 } } as Tenant
  const { data: tenantData } = useProviderQuery<Tenant | null>(
    (p) => p.getTenant(tenantId),
    tenantFallback,
    [tenantId],
  )
  const tenant = tenantData ?? tenantFallback
  const { data: billing } = useProviderQuery<FleetBillingInfo>(
    (p) => p.getTenantBillingInfo(tenantId),
    { plan: 'starter', monthlySpend: 0, agentsInstalled: 0, runsThisMonth: 0 },
    [tenantId],
  )

  const [workspaceName, setWorkspaceName] = useState(tenant.name)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [slackNotifications, setSlackNotifications] = useState(true)
  const [runAlerts, setRunAlerts] = useState(true)
  const [approvalAlerts, setApprovalAlerts] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(false)
  const [timezone, setTimezone] = useState('America/New_York')
  const [saved, setSaved] = useState(false)
  
  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your workspace preferences and billing</p>
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
          <Card>
            <CardHeader>
              <CardTitle>Workspace Settings</CardTitle>
              <CardDescription>Basic configuration for your workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Workspace Name</Label>
                <Input 
                  id="name" 
                  value={workspaceName}
                  onChange={e => setWorkspaceName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slug">Workspace URL</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">agentmou.io/app/</span>
                  <Input 
                    id="slug" 
                    value={tenant.id}
                    className="max-w-xs"
                    disabled
                  />
                </div>
                <p className="text-xs text-muted-foreground">Contact support to change your workspace URL</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
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
              
              <Separator />
              
              <div className="space-y-2">
                <Label>Workspace ID</Label>
                <code className="block rounded bg-muted px-3 py-2 text-sm">{tenant.id}</code>
                <p className="text-xs text-muted-foreground">Use this ID for API integrations</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div>
                {saved && (
                  <span className="flex items-center gap-2 text-sm text-chart-3">
                    <Check className="h-4 w-4" />
                    Settings saved
                  </span>
                )}
              </div>
              <Button onClick={handleSave}>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Control how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Channels</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Slack Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive notifications in Slack</p>
                  </div>
                  <Switch checked={slackNotifications} onCheckedChange={setSlackNotifications} />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Alert Types</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Run Failures</p>
                    <p className="text-sm text-muted-foreground">Get notified when agent runs fail</p>
                  </div>
                  <Switch checked={runAlerts} onCheckedChange={setRunAlerts} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Approval Requests</p>
                    <p className="text-sm text-muted-foreground">Get notified when actions need approval</p>
                  </div>
                  <Switch checked={approvalAlerts} onCheckedChange={setApprovalAlerts} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Weekly Digest</p>
                    <p className="text-sm text-muted-foreground">Receive a weekly summary of activity</p>
                  </div>
                  <Switch checked={weeklyDigest} onCheckedChange={setWeeklyDigest} />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>Save Preferences</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>Your subscription details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold capitalize">{billing.plan}</p>
                    <p className="text-muted-foreground">
                      ${billing.monthlySpend.toFixed(2)}/month
                    </p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Agents installed</span>
                    <span>{billing.agentsInstalled} / {billing.plan === 'starter' ? '3' : billing.plan === 'growth' ? '10' : 'Unlimited'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Runs this month</span>
                    <span>{formatNumber(billing.runsThisMonth)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Billing period</span>
                    <span>Monthly</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  Upgrade Plan
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>Your billing information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-16 items-center justify-center rounded-md border bg-card">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium">Visa ending in 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/2027</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">Update Payment Method</Button>
              </CardFooter>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>Download your past invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { date: 'Feb 2026', amount: 149.00, status: 'paid' },
                  { date: 'Jan 2026', amount: 149.00, status: 'paid' },
                  { date: 'Dec 2025', amount: 149.00, status: 'paid' },
                ].map((invoice, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-4">
                      <span className="font-medium">{invoice.date}</span>
                      <Badge variant="secondary">{invoice.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">${invoice.amount.toFixed(2)}</span>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Danger Zone Tab */}
        <TabsContent value="danger" className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Actions in this section are irreversible. Please proceed with caution.
            </AlertDescription>
          </Alert>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle>Delete Workspace</CardTitle>
              <CardDescription>
                Permanently delete this workspace and all its data, including agents, workflows, runs, and configurations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                This action cannot be undone. All team members will lose access, and all data will be permanently deleted.
              </p>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Workspace
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle>Export Data</CardTitle>
              <CardDescription>
                Download all your workspace data before deletion.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export All Data
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
