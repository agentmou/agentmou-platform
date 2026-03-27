import type {
  AlertId,
  BackendCapabilityMetadata,
  ControlType,
} from 'hc-coherence';

export const HC_PROTOCOL_VERSION = '1.0.1';

export const DEFAULT_CONTROL_ORDER: readonly ControlType[] = [
  'execution_gating',
  'timing',
  'participation',
  'structure',
  'recovery',
];

export const ALERT_TO_CONTROL_TYPES: Readonly<Record<AlertId, readonly ControlType[]>> =
  {
    'structure.phase-order-degraded': ['structure'],
    'structure.granularity-mismatch': ['structure'],
    'structure.unbounded-iteration-risk': ['execution_gating', 'timing'],
    'timing.insufficient-stabilization-window': ['timing'],
    'timing.retry-thrash': ['execution_gating', 'timing'],
    'participation.over-participation-noise-saturation': ['participation'],
    'participation.under-participation-missing-contributor': ['participation'],
    'participation.tool-dominance-drift': ['participation', 'structure'],
    'context.weak-context-integration': ['participation', 'structure'],
    'context.translation-conflict': ['structure'],
    'context.contamination-risk': ['participation', 'recovery'],
    'stability.coherence-margin-low': ['execution_gating', 'timing'],
    'stability.option-space-incomplete': ['execution_gating', 'structure'],
    'recovery.checkpoint-missing': ['recovery'],
    'recovery.state-inconsistency-detected': ['execution_gating', 'recovery'],
    'recovery.irrecoverable-step-failure': ['recovery'],
  };

export const CONTROL_ORDER_INDEX = Object.freeze(
  DEFAULT_CONTROL_ORDER.reduce<Record<ControlType, number>>((acc, type, index) => {
    acc[type] = index;
    return acc;
  }, {} as Record<ControlType, number>),
);

export const PARTICIPATION_MODE_PRECEDENCE = Object.freeze({
  expand: 1,
  restrict: 2,
  isolate: 3,
} as const);

export const STRUCTURE_GRANULARITY_PRECEDENCE = Object.freeze({
  unchanged: 0,
  finer: 1,
  coarser: 2,
} as const);

export const DEFAULT_CAPABILITY_METADATA: BackendCapabilityMetadata = {
  resolver_profile: 'openclaw.reference',
  available_primitives: {
    execution_gating: [
      {
        primitive_family: 'hold_step_gate',
        properties: {
          reversible: true,
          idempotent: true,
          supported_scopes: ['turn', 'episode', 'session'],
          boundedness: { max_retries: 1 },
          observability: { emits_results: true, emits_state_token: false },
        },
      },
      {
        primitive_family: 'request_review_gate',
        properties: {
          reversible: true,
          idempotent: true,
          supported_scopes: ['episode', 'session'],
          boundedness: {},
          observability: { emits_results: true, emits_state_token: false },
        },
      },
    ],
    timing: [
      {
        primitive_family: 'apply_backoff_window',
        properties: {
          reversible: true,
          idempotent: true,
          supported_scopes: ['turn', 'episode', 'session'],
          boundedness: { max_delay_ms: 1200, timebox_ms: 15000 },
          observability: { emits_results: true, emits_state_token: true },
        },
      },
    ],
    structure: [
      {
        primitive_family: 'enforce_phase_profile',
        properties: {
          reversible: true,
          idempotent: true,
          supported_scopes: ['episode', 'session'],
          boundedness: {},
          observability: { emits_results: true, emits_state_token: false },
        },
      },
    ],
    participation: [
      {
        primitive_family: 'restrict_participants',
        properties: {
          reversible: true,
          idempotent: true,
          supported_scopes: ['turn', 'episode', 'session'],
          boundedness: {},
          observability: { emits_results: true, emits_state_token: false },
        },
      },
    ],
    recovery: [
      {
        primitive_family: 'rollback_to_checkpoint',
        properties: {
          reversible: true,
          idempotent: false,
          supported_scopes: ['episode', 'session'],
          boundedness: { max_restart_depth: 1 },
          observability: { emits_results: true, emits_state_token: true },
        },
      },
    ],
  },
  policy_blocked_control_types: [],
};

export const ALERT_METADATA = {
  'structure.phase-order-degraded': {
    alertType: 'structure',
    headline: 'Phase order degraded',
    conditionSummary: 'required review phases appear skipped.',
    impactedArea: 'trajectory',
    reversibility: 'must',
    idempotence: 'must',
    signalName: 'missing_phase_labels',
  },
  'structure.granularity-mismatch': {
    alertType: 'structure',
    headline: 'Granularity mismatch',
    conditionSummary: 'work is too coarse for bounded delegation.',
    impactedArea: 'coherence',
    reversibility: 'should',
    idempotence: 'must',
    signalName: 'granularity_mismatch',
  },
  'structure.unbounded-iteration-risk': {
    alertType: 'structure',
    headline: 'Unbounded iteration risk',
    conditionSummary: 'the scope risks looping without a checkpoint.',
    impactedArea: 'trajectory',
    reversibility: 'must',
    idempotence: 'should',
    signalName: 'iteration_risk',
  },
  'timing.insufficient-stabilization-window': {
    alertType: 'timing',
    headline: 'Insufficient stabilization window',
    conditionSummary: 'the current scope needs extra dwell time.',
    impactedArea: 'coherence',
    reversibility: 'should',
    idempotence: 'must',
    signalName: 'stabilization_window',
  },
  'timing.retry-thrash': {
    alertType: 'timing',
    headline: 'Retry thrash',
    conditionSummary: 'retries are repeating with little state change.',
    impactedArea: 'trajectory',
    reversibility: 'must',
    idempotence: 'should',
    signalName: 'retry_count',
  },
  'participation.over-participation-noise-saturation': {
    alertType: 'participation',
    headline: 'Over participation saturation',
    conditionSummary: 'too many contributors are active in the current scope.',
    impactedArea: 'integration',
    reversibility: 'should',
    idempotence: 'must',
    signalName: 'participant_count',
  },
  'participation.under-participation-missing-contributor': {
    alertType: 'participation',
    headline: 'Under participation',
    conditionSummary: 'the active scope is missing required contributors.',
    impactedArea: 'integration',
    reversibility: 'should',
    idempotence: 'must',
    signalName: 'participant_count',
  },
  'participation.tool-dominance-drift': {
    alertType: 'participation',
    headline: 'Tool dominance drift',
    conditionSummary: 'one participant or tool is dominating the flow.',
    impactedArea: 'cross_system',
    reversibility: 'should',
    idempotence: 'should',
    signalName: 'drift_score',
  },
  'context.weak-context-integration': {
    alertType: 'context',
    headline: 'Weak context integration',
    conditionSummary: 'context channels are not coherently integrated.',
    impactedArea: 'integration',
    reversibility: 'should',
    idempotence: 'must',
    signalName: 'context_channels',
  },
  'context.translation-conflict': {
    alertType: 'context',
    headline: 'Translation conflict',
    conditionSummary: 'goal translation is conflicted across the active scope.',
    impactedArea: 'translation',
    reversibility: 'must',
    idempotence: 'should',
    signalName: 'contradiction_rate',
  },
  'context.contamination-risk': {
    alertType: 'context',
    headline: 'Contamination risk',
    conditionSummary: 'cross-context leakage risk is elevated.',
    impactedArea: 'cross_system',
    reversibility: 'must',
    idempotence: 'should',
    signalName: 'drift_score',
  },
  'stability.coherence-margin-low': {
    alertType: 'stability',
    headline: 'Coherence margin low',
    conditionSummary: 'the current scope is too close to incoherent output.',
    impactedArea: 'coherence',
    reversibility: 'must',
    idempotence: 'must',
    signalName: 'contradiction_rate',
  },
  'stability.option-space-incomplete': {
    alertType: 'stability',
    headline: 'Option space incomplete',
    conditionSummary: 'the scope lacks enough viable continuation options.',
    impactedArea: 'option_space',
    reversibility: 'must',
    idempotence: 'should',
    signalName: 'viable_options',
  },
  'recovery.checkpoint-missing': {
    alertType: 'recovery',
    headline: 'Checkpoint missing',
    conditionSummary: 'bounded recovery is missing a checkpoint.',
    impactedArea: 'trajectory',
    reversibility: 'should',
    idempotence: 'may',
    signalName: 'checkpoint_state',
  },
  'recovery.state-inconsistency-detected': {
    alertType: 'recovery',
    headline: 'State inconsistency',
    conditionSummary: 'state drift is visible against the latest checkpoint.',
    impactedArea: 'trajectory',
    reversibility: 'must',
    idempotence: 'may',
    signalName: 'drift_score',
  },
  'recovery.irrecoverable-step-failure': {
    alertType: 'recovery',
    headline: 'Irrecoverable step failure',
    conditionSummary: 'the current step cannot recover inside safe bounds.',
    impactedArea: 'trajectory',
    reversibility: 'may',
    idempotence: 'not_required',
    signalName: 'failure_state',
  },
} as const;
