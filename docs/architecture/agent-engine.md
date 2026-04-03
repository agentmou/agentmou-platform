# Agent Engine: Deep Dive

## Purpose & Boundaries

The **Agent Engine** is the runtime that executes AI agents. It orchestrates:

1. **Plan generation**: LLM-based decomposition of tasks into steps
2. **Policy enforcement**: Constraint checking, risk evaluation, approval gating
3. **Tool execution**: Invoking registered tools (Gmail, APIs, n8n workflows)
4. **Memory management**: Conversation context, state between steps
5. **Execution logging**: Step-level telemetry, cost calculation
6. **Approval handling**: HITL (human-in-the-loop) integration

**What it doesn't do**:
- Persistence (database writes handled by RunLogger adapter)
- Scheduling (handled by worker queue consumer)
- n8n workflow composition (n8n's builder owns that)
- Connector OAuth (handled by API service)

**Key design**: Agent Engine is a library (not a service), loaded into the worker process. This avoids HTTP overhead and allows tight integration with local state and database access.

---

## Architecture: Components & Responsibilities

```
ExecuteOptions (input)
    ↓
┌─────────────────────────────────────────────────────┐
│ AgentEngine.execute()                               │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 1. RunLogger.startRun(runId)                    │ │
│ │    → INSERT execution_runs { status: 'running' }│ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 2. PolicyEngine.loadPolicyConfig(config)        │ │
│ │    → Load policy rules + constraints            │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 3. Planner.createPlan(systemPrompt, input)      │ │
│ │    → gpt-4o: generate ExecutionPlan             │ │
│ │    → PlanStep[] with tool names + inputs        │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 4. for each step in plan:                       │ │
│ │                                                 │ │
│ │    a. PolicyEngine.evaluate(tool, context)     │ │
│ │       → { allowed: bool, reason?: string }     │ │
│ │                                                 │ │
│ │    b. if !allowed:                              │ │
│ │       → RunLogger.failStep(step, reason)       │ │
│ │       → continue (skip step)                    │ │
│ │                                                 │ │
│ │    c. RunLogger.startStep(step)                 │ │
│ │       → INSERT execution_steps { status: ... } │ │
│ │                                                 │ │
│ │    d. Toolkit.executeTool(tool, input)         │ │
│ │       → gmail-read, gmail-label, etc.          │ │
│ │       → may call WorkflowDispatcher             │ │
│ │       → may trigger ApprovalGateManager         │ │
│ │                                                 │ │
│ │    e. RunLogger.completeStep(stepId, output)   │ │
│ │       → UPDATE execution_steps + metrics       │ │
│ │                                                 │ │
│ │    f. if requires approval:                     │ │
│ │       → ApprovalGateManager.createRequest()    │ │
│ │       → INSERT approval_requests { status: ... }│
│ │       → PAUSE execution (return)                │ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 5. RunLogger.completeRun(runId, metrics)        │ │
│ │    → UPDATE execution_runs { status: 'success' }│ │
│ │    → aggregate tokens, cost, duration          │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ return AgentExecutionResult                        │
└─────────────────────────────────────────────────────┘
    ↓
AgentExecutionResult { success, output, runId, error?, cost?, tokens? }
```

---

## Component Details

### 1. Planner

**Role**: Generate an execution plan by calling GPT-4o.

**Inputs**:
```typescript
{
  systemPrompt: string,      // Agent personality + objective
  input: unknown,            // User input or context
  availableTools: string[],  // List of tool names
}
```

**Process**:
1. Construct a prompt with:
   - System prompt (from catalog/agents/{id}/prompt.md)
   - Available tools (formatted as JSON schema)
   - User input
2. Call GPT-4o with function_calling mode
3. Parse response into ExecutionPlan

**Output**:
```typescript
interface ExecutionPlan {
  steps: PlanStep[];
  rationale: string;
}

interface PlanStep {
  id: string;
  type: 'tool_call' | 'condition' | 'loop' | 'delay';
  description: string;
  toolName?: string;              // e.g., 'gmail-read'
  toolInput?: Record<string, unknown>;
  condition?: string;             // for conditional branches
}
```

**Example Plan** (Inbox Triage):
```json
{
  "steps": [
    {
      "id": "step-1",
      "type": "tool_call",
      "description": "Fetch unread emails",
      "toolName": "gmail-read",
      "toolInput": { "query": "is:unread" }
    },
    {
      "id": "step-2",
      "type": "tool_call",
      "description": "Analyze each email for priority",
      "toolName": "analyze-email",
      "toolInput": { "emails": "{{ step-1.output }}" }
    },
    {
      "id": "step-3",
      "type": "tool_call",
      "description": "Apply labels to high-priority emails",
      "toolName": "gmail-label",
      "toolInput": { "emails": "{{ step-2.high_priority }}", "label": "urgent" }
    }
  ],
  "rationale": "Fetches unread emails, analyzes priority, then applies labels."
}
```

**Cost**: GPT-4o API call (~100-500 tokens) per run; amortized in run cost calculation

---

### 2. PolicyEngine

**Role**: Enforce policies and constraints before tool execution.

**Policy Structure** (from catalog/agents/{id}/policy.yaml):
```yaml
policies:
  - id: gmail-read-only
    description: "Only read emails, never modify"
    rules:
      - action: 'gmail.read'
        allowed: true
      - action: 'gmail.write'
        allowed: false
        riskLevel: 'high'
        requiresApproval: true

constraints:
  - resource: 'email'
    maxDaily: 1000
    maxPerRun: 100
  - resource: 'api_call'
    cost_threshold: 10  # USD
    requiresApproval: true
```

**Evaluation Process**:

```typescript
async evaluate(
  action: string,           // e.g., 'gmail.send'
  context: {
    agentId: string;
    userId?: string;
    runCostSoFar?: number;
  }
): Promise<EvaluationResult> {
  // 1. Look up policy rule for action
  const rule = this.policies[action];
  if (!rule) return { allowed: false, reason: 'No policy for action' };

  // 2. Check if allowed
  if (!rule.allowed) {
    return {
      allowed: false,
      reason: `Action '${action}' not allowed`,
      requiresApproval: rule.requiresApproval,
      riskLevel: rule.riskLevel,
    };
  }

  // 3. Check constraints
  if (rule.riskLevel === 'high' && !context.hasApproval) {
    return {
      allowed: false,
      reason: 'High-risk action requires approval',
      requiresApproval: true,
      riskLevel: 'high',
    };
  }

  return { allowed: true };
}
```

**Example Decisions**:
- `gmail.read` → allowed (low risk)
- `gmail.send` on policy without send → blocked (soft fail, step skipped)
- `gmail.send` on policy with requiresApproval=true → triggers HITL

---

### 3. Toolkit

**Role**: Registry of available tools and executor.

**Tool Definition**:
```typescript
interface ToolDefinition {
  id: string;                    // e.g., 'gmail-read'
  name: string;
  description: string;
  inputSchema: ZodSchema;        // Runtime validation
  outputSchema: ZodSchema;
  requiredConnectors?: string[]; // ['gmail']
  executor: (input, context) => Promise<unknown>;
}
```

**Built-in Tools**:

| Tool | Input | Output | Connector | Notes |
| ------ | ------- | -------- | ----------- | ------- |
| gmail-read | query, maxResults | Message[] | gmail | Read emails |
| gmail-label | messageIds, label | { count } | gmail | Apply label |
| gmail-send | to, subject, body | { messageId } | gmail | Send email |
| analyze-email | subject, content, sender | Classification | agents (sidecar) | NLP classification |
| invoke-workflow | workflowId, input | output | n8n | Call n8n workflow |

**Execution Context**:
```typescript
interface ToolContext {
  tenantId: string;
  userId?: string;
  runId: string;
  connectors?: Map<string, Connector>;
  agentsApiUrl?: string;
  agentsApiKey?: string;
}
```

**Example: Gmail-Read Executor**:
```typescript
async function gmailRead(input: unknown, context: ToolContext) {
  const { query, maxResults } = input as { query: string; maxResults?: number };
  const gmailConnector = context.connectors?.get('gmail');
  if (!gmailConnector) throw new Error('Gmail connector not configured');

  const messages = await gmailConnector.listMessages({
    q: query,
    maxResults: maxResults ?? 10,
  });

  return messages;
}
```

**Validation**: Input validated against inputSchema before execution; invalid input → step fails with error message

---

### 4. MemoryManager

**Role**: Maintain conversation history and agent state.

**Structure**:
```typescript
interface Memory {
  conversationHistory: ConversationTurn[];
  state: Record<string, unknown>;      // K-V store
  variables: Record<string, unknown>;  // Template substitutions
}

interface ConversationTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  stepId?: string;
}
```

**Uses**:
- **Multi-turn agents**: Maintain context across multiple plan iterations
- **State persistence**: Store intermediate results (e.g., email list from step 1)
- **Template variables**: Substitute {{variable}} in prompts

**Example**:
```typescript
// After step-1 (gmail-read) completes
memory.conversationHistory.push({
  role: 'assistant',
  content: 'Found 5 unread emails',
  timestamp: Date.now(),
  stepId: 'step-1',
});
memory.state['unreadEmails'] = [...];

// In step-3 tool input, substitute:
// toolInput: { emails: "{{ state.unreadEmails }}" }
// → resolved to actual array
```

---

### 5. WorkflowDispatcher

**Role**: Invoke n8n workflows and return results.

**Integration Pattern**:
```typescript
async dispatchWorkflow(
  workflowId: string,
  input: unknown,
  context: ToolContext
): Promise<unknown> {
  const n8nUrl = process.env.N8N_URL;  // e.g., 'http://localhost:5678'

  const response = await fetch(`${n8nUrl}/webhook/${workflowId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, tenantId: context.tenantId }),
  });

  if (!response.ok) throw new Error(`Workflow failed: ${response.statusText}`);
  return response.json();
}
```

**Use Cases**:
- Call deterministic workflows (data validation, transformation)
- Delegate to n8n for integrations we don't have in agent engine
- Example: Inbox Triage might invoke n8n workflow for "apply Gmail label" (if Gmail connector unavailable in agent-engine)

**Async Handling**: Workflows typically respond synchronously; for long-running workflows, n8n can call back via webhook

---

### 6. ApprovalGateManager

**Role**: Pause execution and request human approval for risky actions.

**Trigger Conditions**:
1. **Policy-driven**: PolicyEngine.evaluate() returns `requiresApproval=true`
2. **User-invoked**: Agent step explicitly requests approval
3. **Risk threshold**: Cost or impact exceeds configured limits

**Flow**:
```typescript
async createApprovalRequest(
  runId: string,
  tenantId: string,
  options: {
    actionType: string;      // 'send_email', 'delete_record'
    riskLevel: 'low' | 'medium' | 'high';
    title: string;           // "Send auto-reply?"
    description: string;
    payloadPreview: unknown; // Data to be acted upon
    context: unknown;        // Agent state for context
  }
): Promise<ApprovalRequest> {
  const request = {
    id: randomUUID(),
    runId,
    tenantId,
    ...options,
    status: 'pending',
    resumeToken: generateSecureToken(), // For resuming execution
    requestedAt: new Date(),
  };

  // Persist to DB
  await db.insert(approvalRequests).values(request);

  // Notify via UI (real-time subscription or polling)
  // Execution PAUSES here; worker returns to queue

  return request;
}
```

**Decision Handling**:
```typescript
// User approves/denies via API
async decide(
  requestId: string,
  decision: 'approved' | 'denied',
  reason?: string
): Promise<void> {
  // Update DB
  await db.update(approvalRequests)
    .set({
      status: decision === 'approved' ? 'approved' : 'denied',
      decidedAt: new Date(),
      decisionReason: reason,
    })
    .where(eq(approvalRequests.id, requestId));

  // If approved, enqueue resume job with decision context
  if (decision === 'approved') {
    await queue.add('run-agent-resumed', {
      runId: request.runId,
      approvalId: requestId,
      context: { approved: true },
    });
  }
}
```

**Resume Execution**:
- Worker dequeues resume job
- Loads existing run from database
- Finds last completed step
- Continues from next step with approval context
- Tools can check context to know they were approved

---

### 7. RunLogger

**Role**: Record execution telemetry for debugging and billing.

**Operations**:

```typescript
async startRun(runId: string): Promise<void> {
  await db.insert(executionRuns).values({
    id: runId,
    status: 'running',
    startedAt: new Date(),
    // ... other fields
  });
}

async startStep(
  runId: string,
  step: {
    id: string;
    name: string;
    type: string;
  }
): Promise<void> {
  await db.insert(executionSteps).values({
    id: step.id,
    runId,
    type: step.type,
    name: step.name,
    status: 'running',
    startedAt: new Date(),
  });
}

async completeStep(
  runId: string,
  stepId: string,
  output: unknown,
  metadata?: {
    tokenUsage?: number;
    cost?: number;
    duration?: number;
  }
): Promise<void> {
  await db.update(executionSteps)
    .set({
      status: 'success',
      output,
      completedAt: new Date(),
      ...(metadata || {}),
    })
    .where(eq(executionSteps.id, stepId));
}

async completeRun(
  runId: string,
  status: 'success' | 'failed' | 'pending_approval',
  metrics: {
    tokensUsed: number;
    costEstimate: number;
  }
): Promise<void> {
  const duration = Date.now() - (await getRunStartTime(runId));
  await db.update(executionRuns)
    .set({
      status,
      completedAt: new Date(),
      durationMs: duration,
      tokensUsed: metrics.tokensUsed,
      costEstimate: metrics.costEstimate,
    })
    .where(eq(executionRuns.id, runId));
}
```

**Metrics Aggregation**:
- Token count: Sum from OpenAI calls (planner, analyze-email sidecar)
- Cost: tokens * rate_per_1k + external_api_calls
- Duration: completedAt - startedAt

**Used For**:
- Frontend displays step-by-step progress
- Billing system calculates overages
- Analytics: success rate, avg duration per agent
- Debugging: full audit trail

---

### 8. TemplatesManager

**Role**: Load and prepare agent templates from the catalog.

**Process**:
```typescript
async loadTemplate(templateId: string, tenantId: string): Promise<AgentTemplate> {
  // 1. Load manifest.yaml
  const manifest = await loadYaml(`catalog/agents/${templateId}/manifest.yaml`);

  // 2. Load prompt.md
  const promptMd = await loadFile(`catalog/agents/${templateId}/prompt.md`);

  // 3. Load policy.yaml
  const policy = await loadYaml(`catalog/agents/${templateId}/policy.yaml`);

  // 4. Load installation config (tenant-specific)
  const installation = await db.query.agentInstallations.findFirst({
    where: (t) => t.templateId === templateId && t.tenantId === tenantId,
  });

  // 5. Merge: prompt + config variables
  const systemPrompt = this.substituteVariables(promptMd, installation.config);

  return {
    id: templateId,
    name: manifest.name,
    systemPrompt,
    policy,
    requiredConnectors: manifest.capabilities.requiredConnectors,
    hitlEnabled: installation.hitlEnabled,
  };
}

private substituteVariables(prompt: string, config: Record<string, unknown>): string {
  return prompt.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return String(config[key] ?? '');
  });
}
```

**Example Prompt** (inbox-triage/prompt.md):
```markdown
You are an email triage assistant for {{org_name}}.

Your job is to:
1. Read unread emails
2. Categorize each by: support, sales, general, spam
3. Assign priority: high, medium, low
4. Apply appropriate labels: {{enabled_labels}}

Guidelines:
- Mark urgent customer issues as high priority
- Spam confidence > 0.8: mark spam
- Default to medium if unsure

Respond with JSON array of classifications.
```

**After Substitution** (with tenant config):
```markdown
You are an email triage assistant for Acme Corp.

Your job is to:
1. Read unread emails
2. Categorize each by: support, sales, general, spam
3. Assign priority: high, medium, low
4. Apply appropriate labels: urgent, followup, archived

Guidelines:
- Mark urgent customer issues as high priority
- Spam confidence > 0.8: mark spam
- Default to medium if unsure

Respond with JSON array of classifications.
```

---

## Execution Flow: Step-by-Step

### Scenario: Inbox Triage Agent with Approval

```
1. execute(options)
   ├─ tenantId: 'tenant-123'
   ├─ templateId: 'inbox-triage'
   ├─ runId: 'run-abc'
   └─ input: { maxEmails: 10 }

2. RunLogger.startRun('run-abc')
   → INSERT executionRuns { status: 'running' }

3. Load template
   → manifest.yaml, prompt.md, policy.yaml
   → systemPrompt = "You are an email triage assistant..."
   → policy = { gmail-read: allowed, gmail-send: requiresApproval }

4. Planner.createPlan(systemPrompt, input)
   → GPT-4o: decompose into steps
   → Returns:
     [
       { id: 's1', type: 'tool_call', toolName: 'gmail-read', ... },
       { id: 's2', type: 'tool_call', toolName: 'analyze-email', ... },
       { id: 's3', type: 'tool_call', toolName: 'gmail-label', ... },
     ]

5. For step s1 (gmail-read):
   ├─ PolicyEngine.evaluate('gmail.read')
   │  → allowed: true (no approval needed)
   ├─ RunLogger.startStep('s1')
   │  → INSERT executionSteps { status: 'running' }
   ├─ Toolkit.executeTool('gmail-read', { query: 'is:unread', maxResults: 10 })
   │  → GmailConnector.listMessages()
   │  → Output: Message[]
   ├─ RunLogger.completeStep('s1', messages)
   │  → UPDATE executionSteps { status: 'success', output: messages }
   └─ MemoryManager.state['unreadEmails'] = messages

6. For step s2 (analyze-email):
   ├─ PolicyEngine.evaluate('api.invoke')
   │  → allowed: true
   ├─ RunLogger.startStep('s2')
   ├─ Toolkit.executeTool('analyze-email', { emails: memory.state['unreadEmails'] })
   │  → POST http://agents:5000/analyze-email
   │  → Output: { classifications: [{...}] }
   ├─ RunLogger.completeStep('s2', output)
   └─ MemoryManager.state['classifications'] = output.classifications

7. For step s3 (gmail-label):
   ├─ PolicyEngine.evaluate('gmail.write')
   │  → policy says: allowed: false, requiresApproval: true, riskLevel: 'medium'
   │  → allowed: false (requires human approval)
   ├─ ApprovalGateManager.createApprovalRequest({
   │    actionType: 'gmail_label',
   │    riskLevel: 'medium',
   │    title: "Apply labels to 5 emails?",
   │    description: "Mark 3 as 'urgent', 2 as 'followup'",
   │    payloadPreview: { labels: { urgent: [msgId1, msgId2, msgId3], ... } },
   │    context: { step: 's3', classifications: [...] }
   │  })
   │  → INSERT approvalRequests { status: 'pending', resumeToken: 'token-xyz' }
   │  → Notify frontend (WebSocket or polling)
   └─ Return (execution pauses)

8. User sees approval dashboard:
   → "Apply labels to 5 emails?"
   → Preview: "Mark 3 as 'urgent', 2 as 'followup'"
   → [Approve] [Deny]

9. User clicks Approve:
   → POST /api/approvals/{requestId}/decide { decision: 'approved' }
   → UPDATE approvalRequests { status: 'approved', decidedBy: userId, ... }
   → Enqueue resume-run job

10. Worker dequeues resume-run:
    ├─ Load run state
    ├─ Load last step completion
    ├─ Continue with s3 (gmail-label)
    ├─ Toolkit.executeTool('gmail-label', payload)
    │  → GmailConnector.applyLabel(msgIds, 'urgent')
    │  → GmailConnector.applyLabel(msgIds, 'followup')
    │  → Output: { count: 5, updated: [msgId1, ...] }
    ├─ RunLogger.completeStep('s3', output)
    └─ No more steps

11. RunLogger.completeRun('run-abc', 'success', { tokensUsed: 2500, cost: 0.05 })
    → UPDATE executionRuns { status: 'success', completedAt: now, ... }

12. Result:
    {
      success: true,
      output: { labels_applied: 5 },
      runId: 'run-abc',
      duration: 8500,
      tokensUsed: 2500,
      cost: 0.05,
      stepsCompleted: 3
    }

13. Frontend:
    → Polls GET /api/runs/run-abc
    → Receives success status + step breakdown
    → Displays "Run completed in 8.5s, 5 emails labeled"
```

---

## Integration Points

### 1. OpenAI API

**Called by**: Planner
**Usage**: Plan generation
**Cost**: ~$0.001-0.005 per run (input tokens cheaper than output)
**Error Handling**: Exponential backoff (3 retries); fail if unavailable

### 2. Connectors (Gmail, Slack, etc.)

**Called by**: Toolkit.executeTool()
**Usage**: Email read/send, channel post, etc.
**Authentication**: OAuth tokens from connectorAccounts (decrypted from secretEnvelopes)
**Error Handling**: Connector.test() called periodically; token refresh on 401

### 3. n8n Workflows

**Called by**: WorkflowDispatcher (or as a tool)
**Usage**: Deterministic pipelines, data transformation
**Integration**: HTTP POST to n8n webhook URL
**Async**: Can be sync (response on 200) or async (callback via webhook)

### 4. Python Sidecar (services/agents)

**Called by**: Toolkit.executeTool('analyze-email')
**Service**: services/agents (FastAPI, Python)
**Endpoint**: POST /analyze-email
**Authentication**: X-API-Key header
**Input**: { subject, content, sender }
**Output**: { priority, category, action, labels, confidence, summary }

### 5. Database (PostgreSQL)

**Called by**: RunLogger
**Operations**: INSERT/UPDATE executionRuns, executionSteps, approvalRequests
**Latency**: <50ms typical (should not block execution)

---

## Policy System

### Policy Structure

```yaml
policies:
  gmail.read:
    allowed: true
    riskLevel: 'low'
    requiresApproval: false
    quota:
      daily: 10000
      perRun: 500

  gmail.write:
    allowed: true
    riskLevel: 'high'
    requiresApproval: true

  gmail.delete:
    allowed: false
    reason: 'Not permitted for data safety'

  external_api.invoke:
    allowed: true
    riskLevel: 'medium'
    requiresApproval: false
    cost_threshold: 5.0  # Require approval if cost exceeds $5

constraints:
  - name: 'max_api_spend_per_run'
    value: 50.0  # USD
    enforcement: 'block'  # Stop execution if exceeded

  - name: 'max_emails_per_run'
    value: 100
    enforcement: 'warn'   # Log but don't block
```

### Policy Evaluation Rules

1. **Allowed = true, no approval needed**: Execute immediately
2. **Allowed = true, requires approval**: Create HITL request, pause execution
3. **Allowed = false**: Skip step, log as blocked, continue
4. **Quota exceeded**: Enforce based on policy (block or warn)
5. **Cost threshold**: Create approval if run cost exceeds limit

### Risk Levels

| Level | Examples | Default Approval? |
| ------- | ---------- | ------------------- |
| low | Read email, list files | No |
| medium | Label email, post message | Optional |
| high | Send email, delete record, invoke API | Yes |

---

## Error Handling & Retries

### Tool Execution Errors

```typescript
try {
  const output = await toolkit.executeTool(tool, input, context);
  runLogger.completeStep(stepId, output);
} catch (error) {
  runLogger.failStep(stepId, error.message);

  // Decide: continue or fail run?
  if (error.retry) {
    // Exponential backoff (worker-level)
    await queue.add('run-agent-resume', { runId, stepId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 }
    });
  } else {
    throw error; // Fail run
  }
}
```

### Common Failures

| Error | Cause | Recovery |
| ------- | ------- | ---------- |
| OpenAI timeout | API slow | Retry (backoff) |
| Gmail auth failed | Token expired | Refresh token |
| Rate limit (429) | Too many requests | Exponential backoff |
| n8n workflow failed | Workflow error | Fail step + log |
| Approval timeout | User didn't respond | Expires after 24h, auto-deny |

---

## Cost Calculation

```typescript
// After run completes
const costBreakdown = {
  planner_tokens: 1500,       // Planner GPT-4o call
  planner_cost: 0.012,        // 1500 * $0.000008/token (gpt-4o)

  tool_tokens: 1000,          // analyze-email + external calls
  tool_cost: 0.008,

  external_apis: 0.02,        // n8n call, Slack API, etc.

  total: 0.040,               // USD
};

// Stored in executionRuns.costEstimate
// Used for:
// - Billing (included in run quota or overage charge)
// - Analytics (avg cost per agent)
// - Safety cap enforcement
```

---

## Performance Considerations

### Latency Budget (per run)

| Phase | Typical | Max |
| ------- | --------- | ----- |
| Plan generation (GPT-4o) | 2-5s | 10s |
| Step execution (tools) | 0.1-2s each | 30s |
| Policy evaluation | <10ms | 100ms |
| HITL approval (wait) | Manual, ~1min | N/A |
| Logging (DB writes) | <50ms | 500ms |
| **Total (3 steps)** | **6-9s** | **35s** |

### Optimization Strategies

1. **Cache planner**: For repeated agents, cache last plan (risky; requires stable input)
2. **Parallel steps**: Some plans could be parallelized (future work)
3. **Streaming plans**: Return partial plans to user while generating rest
4. **Policy pre-check**: Evaluate all steps before execution (detect blocking early)

---

## Related Documentation

- **[Architecture Overview](./overview.md)**: System topology, data flow
- **[Data Model](./data-model.md)**: executionRuns, executionSteps, approvalRequests tables
- **[Conventions](./conventions.md)**: Error handling patterns, typing
