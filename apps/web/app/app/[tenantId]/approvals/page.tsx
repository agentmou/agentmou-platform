'use client';

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  Clock,
  Bot,
  Mail,
  Ticket,
  Calendar,
  AlertTriangle,
  Eye,
  MessageSquare,
  Search,
  FileText,
  ExternalLink,
} from 'lucide-react';
import type { AgentTemplate, ApprovalRequest } from '@agentmou/contracts';
import { RiskBadge, StatusPill } from '@/components/badges';
import { JsonViewer } from '@/components/json-viewer';
import { cn, formatDate } from '@/lib/utils';
import { useProviderQuery } from '@/lib/data/use-provider-query';
import { EmptyState } from '@/components/control-plane/empty-state';

const actionTypeIcons: Record<string, React.ElementType> = {
  send_email: Mail,
  create_ticket: Ticket,
  update_crm: Calendar,
  update_calendar: Calendar,
  post_message: MessageSquare,
};

// Mock audit log for approvals
const generateAuditLog = (approval: ApprovalRequest) => [
  {
    id: '1',
    timestamp: approval.requestedAt,
    action: 'Request created',
    actor: 'system',
    details: `${approval.actionType} action requested`,
  },
  ...(approval.status !== 'pending'
    ? [
        {
          id: '2',
          timestamp: approval.decidedAt || '',
          action: approval.status === 'approved' ? 'Approved' : 'Rejected',
          actor: approval.decidedBy || 'admin',
          details: approval.decisionReason || 'No reason provided',
        },
      ]
    : []),
];

function ApprovalsPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantId = params.tenantId as string;
  const { data: agentTemplates } = useProviderQuery<AgentTemplate[]>(
    (p) => p.listCatalogAgentTemplates(),
    [],
    []
  );
  const { data: approvalsData } = useProviderQuery<ApprovalRequest[]>(
    (p) => p.listTenantApprovals(tenantId),
    [],
    [tenantId]
  );
  const [localOverrides, setLocalOverrides] = React.useState<Map<string, Partial<ApprovalRequest>>>(
    new Map()
  );
  const approvals = React.useMemo(
    () =>
      (approvalsData ?? []).map((a) => ({
        ...a,
        ...localOverrides.get(a.id),
      })) as ApprovalRequest[],
    [approvalsData, localOverrides]
  );
  const [selectedApprovalId, setSelectedApprovalId] = React.useState<string | null>(
    searchParams.get('approvalId')
  );
  const [rejectReason, setRejectReason] = React.useState('');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [riskFilter, setRiskFilter] = React.useState('all');

  const selectedApproval = approvals.find((a) => a.id === selectedApprovalId) || null;

  // Filter approvals
  const filteredApprovals = approvals.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (riskFilter !== 'all' && a.riskLevel !== riskFilter) return false;
    if (searchQuery) {
      const agent = agentTemplates.find((ag) => ag.id === a.agentId);
      const searchLower = searchQuery.toLowerCase();
      if (
        !a.title.toLowerCase().includes(searchLower) &&
        !agent?.name.toLowerCase().includes(searchLower) &&
        !a.actionType.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }
    return true;
  });

  const pendingApprovals = filteredApprovals.filter((a) => a.status === 'pending');
  const resolvedApprovals = filteredApprovals.filter((a) => a.status !== 'pending');

  // Calculate stats
  const allPending = approvals.filter((a) => a.status === 'pending');
  const avgPendingTime =
    allPending.length > 0
      ? Math.round(
          allPending.reduce((acc, a) => {
            const diff = Date.now() - new Date(a.requestedAt).getTime();
            return acc + diff / (1000 * 60 * 60); // hours
          }, 0) / allPending.length
        )
      : 0;

  const handleApprove = (approval: ApprovalRequest) => {
    setLocalOverrides((prev) =>
      new Map(prev).set(approval.id, {
        status: 'approved' as const,
        decidedAt: new Date().toISOString(),
        decidedBy: 'admin@acme.com',
      })
    );
    toast.success('Request approved', {
      description: 'The action will be executed.',
    });
    const nextPending = approvals.find((a) => a.status === 'pending' && a.id !== approval.id);
    if (nextPending) {
      setSelectedApprovalId(nextPending.id);
    } else {
      setSelectedApprovalId(null);
    }
  };

  const handleReject = (approval: ApprovalRequest) => {
    setLocalOverrides((prev) =>
      new Map(prev).set(approval.id, {
        status: 'rejected' as const,
        decidedAt: new Date().toISOString(),
        decidedBy: 'admin@acme.com',
        decisionReason: rejectReason,
      })
    );
    toast.success('Request rejected', {
      description: 'The action has been blocked.',
    });
    setIsRejectDialogOpen(false);
    setRejectReason('');
    const nextPending = approvals.find((a) => a.status === 'pending' && a.id !== approval.id);
    if (nextPending) {
      setSelectedApprovalId(nextPending.id);
    } else {
      setSelectedApprovalId(null);
    }
  };

  // Render email preview
  const renderPayloadPreview = (approval: ApprovalRequest) => {
    const payload = approval.payloadPreview as Record<string, unknown>;
    const to = typeof payload.to === 'string' ? payload.to : null;
    const subject = typeof payload.subject === 'string' ? payload.subject : null;
    const body = typeof payload.body === 'string' ? payload.body : null;
    const title = typeof payload.title === 'string' ? payload.title : null;
    const priority = typeof payload.priority === 'string' ? payload.priority : null;
    const description = typeof payload.description === 'string' ? payload.description : null;

    if (approval.actionType === 'send_email' && to) {
      return (
        <div className="space-y-3 p-4 bg-muted/30 rounded-sm border border-border/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            <span>Email Preview</span>
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="text-xs text-muted-foreground w-12">To:</span>
              <span className="text-sm">{to}</span>
            </div>
            {subject && (
              <div className="flex gap-2">
                <span className="text-xs text-muted-foreground w-12">Subject:</span>
                <span className="text-sm font-medium">{subject}</span>
              </div>
            )}
            {body && (
              <div className="pt-2 border-t border-border/30">
                <p className="text-sm whitespace-pre-wrap">{body}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (approval.actionType === 'create_ticket' && title) {
      return (
        <div className="space-y-3 p-4 bg-muted/30 rounded-sm border border-border/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Ticket className="h-3.5 w-3.5" />
            <span>Ticket Preview</span>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{title}</p>
            {priority && (
              <div className="flex gap-2">
                <span className="text-xs text-muted-foreground">Priority:</span>
                <span className="text-xs uppercase">{priority}</span>
              </div>
            )}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
      );
    }

    // Default: show JSON
    return <JsonViewer data={payload} maxHeight="200px" />;
  };

  // Approval list item
  const ApprovalListItem = ({
    approval,
    isSelected,
  }: {
    approval: ApprovalRequest;
    isSelected: boolean;
  }) => {
    const agent = agentTemplates.find((a) => a.id === approval.agentId);
    const ActionIcon = actionTypeIcons[approval.actionType] || AlertTriangle;

    return (
      <button
        onClick={() => setSelectedApprovalId(approval.id)}
        className={cn(
          'w-full flex items-start gap-3 p-3 text-left border-b border-border/30 hover:bg-muted/30 transition-colors',
          isSelected && 'bg-muted/50'
        )}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded bg-muted/50 shrink-0">
          <ActionIcon className="h-4 w-4 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{approval.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {agent?.name || approval.agentId} · {formatDate(approval.requestedAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <RiskBadge level={approval.riskLevel} showIcon={false} />
          {approval.status === 'pending' ? (
            <span className="text-[10px] uppercase tracking-wide text-accent">Pending</span>
          ) : (
            <StatusPill
              status={approval.status === 'approved' ? 'success' : 'error'}
              label={approval.status}
            />
          )}
        </div>
      </button>
    );
  };

  // Detail panel
  const DetailPanel = ({ approval }: { approval: ApprovalRequest }) => {
    const agent = agentTemplates.find((a) => a.id === approval.agentId);
    const auditLog = generateAuditLog(approval);

    return (
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-lg">{approval.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{approval.description}</p>
              </div>
              <RiskBadge level={approval.riskLevel} />
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Bot className="h-3.5 w-3.5" />
                <span>{agent?.name || approval.agentId}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatDate(approval.requestedAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                <span className="capitalize">{approval.actionType.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          {/* Actions (if pending) */}
          {approval.status === 'pending' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedApprovalId(approval.id);
                  setIsRejectDialogOpen(true);
                }}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button size="sm" onClick={() => handleApprove(approval)}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
            </div>
          )}

          {/* Payload Preview */}
          <div className="space-y-2">
            <p className="text-editorial-tiny">Preview</p>
            {renderPayloadPreview(approval)}
          </div>

          {/* Context */}
          {approval.context && (
            <div className="space-y-2">
              <p className="text-editorial-tiny">Context</p>
              <div className="space-y-3">
                {approval.context.sources && approval.context.sources.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {approval.context.sources.map((source, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-muted/50 rounded text-xs"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {source}
                      </span>
                    ))}
                  </div>
                )}
                {approval.context.previousMessages && (
                  <div className="space-y-1">
                    {approval.context.previousMessages.map((msg, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        • {msg}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Audit Log */}
          <div className="space-y-2">
            <p className="text-editorial-tiny">Audit Log</p>
            <div className="space-y-2">
              {auditLog.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 text-xs">
                  <div className="w-32 text-muted-foreground shrink-0">
                    {formatDate(entry.timestamp)}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">{entry.action}</span>
                    <span className="text-muted-foreground"> by {entry.actor}</span>
                    {entry.details && (
                      <p className="text-muted-foreground mt-0.5">{entry.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Raw Payload */}
          <div className="space-y-2">
            <p className="text-editorial-tiny">Raw Payload</p>
            <JsonViewer data={approval.payloadPreview} collapsible defaultCollapsed />
          </div>
        </div>
      </ScrollArea>
    );
  };

  if (approvalsData.length === 0) {
    return (
      <div className="p-6 lg:p-8 space-y-8">
        <div>
          <p className="text-editorial-tiny mb-2">Approvals</p>
          <h1 className="text-2xl font-bold tracking-tight">Approvals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and manage human-in-the-loop approval requests.
          </p>
        </div>
        <EmptyState
          icon={CheckCircle}
          title="No pending approvals"
          description="When your agents encounter high-risk actions that require human oversight, approval requests will appear here. Configure HITL policies in your agent settings."
          actionLabel="Go to Fleet"
          actionHref={`/app/${tenantId}/fleet`}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left Panel - List */}
      <div className="w-full md:w-[400px] lg:w-[450px] border-r border-border/50 flex flex-col">
        {/* Header */}
        <div className="p-6 lg:p-8 border-b border-border/50 space-y-4">
          <div>
            <p className="text-editorial-tiny mb-2">Approvals</p>
            <h1 className="text-2xl font-bold tracking-tight">Approvals</h1>
            <p className="text-sm text-muted-foreground mt-1">Review and approve HITL actions</p>
          </div>

          {/* Stats */}
          <div className="flex gap-4">
            <div>
              <p className="text-2xl font-bold">{allPending.length}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pending</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{avgPendingTime}h</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg Wait</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search approvals..."
                className="pl-9 h-8 text-sm border-border/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Status
                  </SelectItem>
                  <SelectItem value="pending" className="text-xs">
                    Pending
                  </SelectItem>
                  <SelectItem value="approved" className="text-xs">
                    Approved
                  </SelectItem>
                  <SelectItem value="rejected" className="text-xs">
                    Rejected
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Risk
                  </SelectItem>
                  <SelectItem value="low" className="text-xs">
                    Low
                  </SelectItem>
                  <SelectItem value="medium" className="text-xs">
                    Medium
                  </SelectItem>
                  <SelectItem value="high" className="text-xs">
                    High
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1 px-6 lg:px-8">
          <Tabs defaultValue="pending" className="w-full space-y-4">
            <TabsList className="w-full">
              <TabsTrigger value="pending" className="flex-1">
                Pending ({pendingApprovals.length})
              </TabsTrigger>
              <TabsTrigger value="resolved" className="flex-1">
                Resolved ({resolvedApprovals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="m-0">
              {pendingApprovals.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium">All caught up</p>
                  <p className="text-xs text-muted-foreground">No pending approvals</p>
                </div>
              ) : (
                pendingApprovals.map((approval) => (
                  <ApprovalListItem
                    key={approval.id}
                    approval={approval}
                    isSelected={selectedApprovalId === approval.id}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="resolved" className="m-0">
              {resolvedApprovals.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">No resolved approvals</p>
                </div>
              ) : (
                resolvedApprovals.map((approval) => (
                  <ApprovalListItem
                    key={approval.id}
                    approval={approval}
                    isSelected={selectedApprovalId === approval.id}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </div>

      {/* Right Panel - Detail */}
      <div className="hidden md:flex flex-1 flex-col bg-muted/10">
        {selectedApproval ? (
          <DetailPanel approval={selectedApproval} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Select an approval to review</p>
            </div>
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">Reject Request</DialogTitle>
            <DialogDescription className="text-xs">
              Please provide a reason for rejecting this request.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="text-sm border-border/50"
          />
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setIsRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs"
              onClick={() => selectedApproval && handleReject(selectedApproval)}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ApprovalsPage() {
  return <ApprovalsPageContent />;
}
