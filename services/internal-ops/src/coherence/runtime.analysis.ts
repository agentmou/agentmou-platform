import type {
  AlertId,
  ConditionAlert,
  ExecutionSnapshot,
  Timestamp,
} from 'hc-coherence';

import {
  ALERT_METADATA,
  ALERT_TO_CONTROL_TYPES,
  CONTROL_ORDER_INDEX,
} from './runtime.constants.js';

export function analyzeSnapshot(
  snapshot: ExecutionSnapshot,
  options: {
    flowId: string;
    timestampMs: number;
    protocolVersion: string;
    timestamp: (timestampMs: number) => Timestamp;
  },
): ConditionAlert[] {
  const alerts = new Map<AlertId, number>();
  const viableOptions = snapshot.candidate_options.filter(
    (option) => option.viable !== false,
  ).length;
  const hints = snapshot.observability_hints ?? {};

  const mark = (alertId: AlertId, signal: number) => {
    if (!alerts.has(alertId)) {
      alerts.set(alertId, signal);
    }
  };

  if (snapshot.retry_count >= 2) {
    mark('timing.retry-thrash', snapshot.retry_count);
  }
  if (snapshot.participants.length > (hints.participant_budget_max ?? 4)) {
    mark(
      'participation.over-participation-noise-saturation',
      snapshot.participants.length,
    );
  }
  if (snapshot.participants.length < 2) {
    mark('participation.under-participation-missing-contributor', 1);
  }
  if (snapshot.contradiction_rate >= 0.35) {
    mark('context.translation-conflict', snapshot.contradiction_rate);
  }
  if (snapshot.drift_score >= 0.7) {
    mark('context.contamination-risk', snapshot.drift_score);
  }
  if (snapshot.drift_score >= 0.55) {
    mark('participation.tool-dominance-drift', snapshot.drift_score);
  }
  if ((snapshot.context_channels.length ?? 0) < 2) {
    mark('context.weak-context-integration', snapshot.context_channels.length);
  }
  if (viableOptions < (hints.minimum_viable_options ?? 2)) {
    mark('stability.option-space-incomplete', viableOptions);
  }
  if (snapshot.contradiction_rate >= 0.4 || viableOptions < 2) {
    mark('stability.coherence-margin-low', snapshot.contradiction_rate);
  }
  if (!snapshot.checkpoint_token) {
    mark('recovery.checkpoint-missing', 1);
  }
  if (snapshot.drift_score >= 0.8 && Boolean(snapshot.checkpoint_token)) {
    mark('recovery.state-inconsistency-detected', snapshot.drift_score);
  }
  if (hints.insufficient_stabilization_window_detected) {
    mark('timing.insufficient-stabilization-window', 1);
  }

  return [...alerts.entries()]
    .map(([alertId, signal]) => buildAlert(alertId, signal, snapshot, options))
    .sort(
      (left, right) =>
        CONTROL_ORDER_INDEX[ALERT_TO_CONTROL_TYPES[left.alert_id][0]] -
        CONTROL_ORDER_INDEX[ALERT_TO_CONTROL_TYPES[right.alert_id][0]],
    );
}

export function buildCandidateOptions(messageText: string) {
  const keywords = messageText.toLowerCase();
  const options = [
    { id: 'brief', summary: 'Prepare an executive brief', viable: true },
    {
      id: 'workflow',
      summary: 'Dispatch a deterministic workflow',
      viable:
        /workflow|campa(ign|ña)|launch|release|deploy|sync|plan/.test(keywords),
    },
    {
      id: 'approval',
      summary: 'Escalate to approval',
      viable: /launch|publish|budget|pricing|delete|send|transfer/.test(keywords),
    },
  ];

  return options.filter((option) => option.viable);
}

export function scoreContradictionRate(messageText: string) {
  const normalized = messageText.toLowerCase();
  const conflicting = ['but', 'however', 'except', 'unless', 'although'];
  const hits = conflicting.filter((token) => normalized.includes(token)).length;
  return Math.min(0.15 + hits * 0.12, 0.85);
}

export function scoreDrift(messageText: string, participantCount: number) {
  const lengthFactor = Math.min(messageText.length / 400, 0.5);
  const participantFactor = Math.min(Math.max(participantCount - 2, 0) * 0.12, 0.36);
  return Math.min(0.18 + lengthFactor + participantFactor, 0.95);
}

function buildAlert(
  alertId: AlertId,
  signalValue: number,
  snapshot: ExecutionSnapshot,
  options: {
    flowId: string;
    timestampMs: number;
    protocolVersion: string;
    timestamp: (timestampMs: number) => Timestamp;
  },
): ConditionAlert {
  const metadata = ALERT_METADATA[alertId];

  return {
    protocol_version: options.protocolVersion,
    alert_id: alertId,
    alert_type: metadata.alertType,
    headline: metadata.headline,
    condition_summary: metadata.conditionSummary,
    confidence: 0.9,
    scope: snapshot.scope,
    impacted_area: metadata.impactedArea,
    reversibility: metadata.reversibility,
    idempotence: metadata.idempotence,
    escalation_allowed: true,
    flow_id: options.flowId,
    emitted_at: options.timestamp(options.timestampMs),
    evidence: {
      signals: [{ signal: metadata.signalName, value: signalValue }],
      affected_components: ['internal-ops.coherence'],
      notes: metadata.conditionSummary,
    },
  };
}
