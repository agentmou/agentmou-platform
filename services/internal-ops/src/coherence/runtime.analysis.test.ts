import { describe, expect, it } from 'vitest';

import { analyzeSnapshot } from './runtime.analysis.js';
import { HC_PROTOCOL_VERSION } from './runtime.constants.js';
import { createExecutionSnapshot } from './runtime.js';

describe('runtime analysis', () => {
  it('surfaces retry and participation alerts for noisy snapshots', () => {
    const snapshot = createExecutionSnapshot({
      messageText:
        'Launch the campaign, but keep budget tight and sync with engineering and sales while keeping options open.',
      activeAgentId: 'cmo',
      participants: ['ceo', 'cmo', 'cro', 'cto', 'finance'],
      contextChannels: ['telegram', 'department:marketing'],
      toolCalls: ['prepare_brief', 'run_marketing_workflow'],
      successfulResults: 1,
      retryCount: 2,
    });

    const alerts = analyzeSnapshot(snapshot, {
      flowId: 'flow.test.analysis',
      timestampMs: 1740000000000,
      protocolVersion: HC_PROTOCOL_VERSION,
      timestamp: (timestampMs) => ({
        timestamp_ms: timestampMs,
        iso8601: new Date(timestampMs).toISOString(),
      }),
    });

    expect(alerts.map((alert) => alert.alert_id)).toContain('timing.retry-thrash');
    expect(alerts.map((alert) => alert.alert_id)).toContain(
      'participation.over-participation-noise-saturation',
    );
  });
});
