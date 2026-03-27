import { describe, expect, it } from 'vitest';

import type { ConditionAlert, ControlResult, Timestamp } from 'hc-coherence';

import { DEFAULT_CAPABILITY_METADATA, HC_PROTOCOL_VERSION } from './runtime.constants.js';
import {
  buildControlSequence,
  governExecutionState,
  resolveControlSequence,
} from './runtime.controls.js';
import { createExecutionSnapshot } from './runtime.js';

function fixedTimestamp(timestampMs: number): Timestamp {
  return {
    timestamp_ms: timestampMs,
    iso8601: new Date(timestampMs).toISOString(),
  };
}

describe('runtime controls', () => {
  it('orders control sequences according to the configured control priority', () => {
    const alert: ConditionAlert = {
      protocol_version: HC_PROTOCOL_VERSION,
      alert_id: 'timing.retry-thrash',
      alert_type: 'timing',
      headline: 'Retry thrash',
      condition_summary: 'retries are repeating with little state change.',
      confidence: 0.9,
      scope: 'episode',
      impacted_area: 'trajectory',
      reversibility: 'must',
      idempotence: 'should',
      escalation_allowed: true,
      flow_id: 'flow.test.controls',
      emitted_at: fixedTimestamp(1740000000000),
      evidence: {
        signals: [{ signal: 'retry_count', value: 2 }],
        affected_components: ['internal-ops.coherence'],
        notes: 'retry_count',
      },
    };

    const sequence = buildControlSequence(alert, {
      protocolVersion: HC_PROTOCOL_VERSION,
      sequenceId: 'sequence-1',
      createdAt: fixedTimestamp(1740000000000),
    });

    expect(sequence.controls.map((control) => control.control_type)).toEqual([
      'execution_gating',
      'timing',
    ]);

    const result = resolveControlSequence(
      sequence,
      DEFAULT_CAPABILITY_METADATA,
      'result-1',
      fixedTimestamp(1740000000000),
      HC_PROTOCOL_VERSION,
    );

    expect(result.overall_status).toBe('applied');
  });

  it('pauses execution when contamination risk remains partially applied', () => {
    const snapshot = createExecutionSnapshot({
      messageText:
        'Prepare the rollout plan but keep sales, ops, security, and engineering aligned while preserving options for rollback and exception handling.',
      activeAgentId: 'ceo',
      participants: ['ceo', 'cto', 'cro', 'cso', 'ops'],
      contextChannels: ['telegram', 'department:ops'],
      toolCalls: ['prepare_plan'],
      retryCount: 1,
      checkpointToken: 'checkpoint-1',
    });

    const alerts: ConditionAlert[] = [
      {
        protocol_version: HC_PROTOCOL_VERSION,
        alert_id: 'context.contamination-risk',
        alert_type: 'context',
        headline: 'Contamination risk',
        condition_summary: 'cross-context leakage risk is elevated.',
        confidence: 0.9,
        scope: snapshot.scope,
        impacted_area: 'cross_system',
        reversibility: 'must',
        idempotence: 'should',
        escalation_allowed: true,
        flow_id: 'flow.test.controls',
        emitted_at: fixedTimestamp(1740000000000),
        evidence: {
          signals: [{ signal: 'drift_score', value: 0.8 }],
          affected_components: ['internal-ops.coherence'],
          notes: 'drift_score',
        },
      },
    ];

    const results: ControlResult[] = [
      {
        protocol_version: HC_PROTOCOL_VERSION,
        flow_id: 'flow.test.controls',
        sequence_id: 'sequence-1',
        result_id: 'result-1',
        overall_status: 'partially_applied',
        observed_scope: snapshot.scope,
        control_results: [],
        returned_at: fixedTimestamp(1740000000000),
      },
    ];

    const decision = governExecutionState(snapshot, alerts, results);

    expect(decision.continue_mode).toBe('pause');
    expect(decision.execution_controls.execution_gating.paused).toBe(true);
    expect(decision.execution_controls.participation.mode).toBe('isolate');
  });
});
