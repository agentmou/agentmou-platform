import { describe, expect, it } from 'vitest';

import { createExecutionSnapshot, runCoherenceCycle } from './runtime.js';

describe('internal ops coherence runtime', () => {
  it('emits retry and participation controls for noisy scopes', () => {
    const snapshot = createExecutionSnapshot({
      messageText:
        'Launch the campaign, but keep budget tight and sync with engineering and sales however keep options open.',
      activeAgentId: 'cmo',
      participants: ['ceo', 'cmo', 'content-studio', 'cro', 'cto'],
      contextChannels: ['telegram', 'department:marketing'],
      toolCalls: ['prepare_brief', 'run_marketing_workflow'],
      successfulResults: 1,
      retryCount: 2,
    });

    const cycle = runCoherenceCycle(snapshot, {
      flowId: 'flow.test.coherence',
      timestampMs: 1740000000000,
    });

    expect(cycle.alerts.map((alert) => alert.alert_id)).toContain(
      'timing.retry-thrash',
    );
    expect(cycle.alerts.map((alert) => alert.alert_id)).toContain(
      'participation.over-participation-noise-saturation',
    );
    expect(cycle.execution_controls.participation.mode).toBe('isolate');
  });
});
