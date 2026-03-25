import { readFileSync } from 'node:fs';

import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {
  canonicalUrls,
  localArtifacts,
  type AlertId,
  type BackendCapabilityMetadata,
  type CoherenceGovernorDecision,
  type ConditionAlert,
  type ControlConstraints,
  type ControlResolutionContext,
  type ControlResult,
  type ControlSequence,
  type ControlType,
  type ExecutionControls,
  type ExecutionSnapshot,
  type RuntimeCycleResult,
  type Timestamp,
} from 'hc-coherence';

export const HC_PROTOCOL_VERSION = '1.0.1';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const conditionAlertValidator = ajv.compile(
  loadSchema(localArtifacts.conditionAlert),
);
const controlSequenceValidator = ajv.compile(
  loadSchema(localArtifacts.controlSequence),
);
const controlResultValidator = ajv.compile(loadSchema(localArtifacts.controlResult));

const DEFAULT_CONTROL_ORDER: readonly ControlType[] = [
  'execution_gating',
  'timing',
  'participation',
  'structure',
  'recovery',
];

const ALERT_TO_CONTROL_TYPES: Readonly<Record<AlertId, readonly ControlType[]>> =
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

const CONTROL_ORDER_INDEX = Object.freeze(
  DEFAULT_CONTROL_ORDER.reduce<Record<ControlType, number>>((acc, type, index) => {
    acc[type] = index;
    return acc;
  }, {} as Record<ControlType, number>),
);

const PARTICIPATION_MODE_PRECEDENCE = Object.freeze({
  expand: 1,
  restrict: 2,
  isolate: 3,
} as const);

const STRUCTURE_GRANULARITY_PRECEDENCE = Object.freeze({
  unchanged: 0,
  finer: 1,
  coarser: 2,
} as const);

const DEFAULT_CAPABILITY_METADATA: BackendCapabilityMetadata = {
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

const ALERT_METADATA = {
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

export function createExecutionSnapshot(input: {
  messageText: string;
  activeAgentId: string;
  participants: string[];
  contextChannels: string[];
  toolCalls?: string[];
  successfulResults?: number;
  retryCount?: number;
  phaseLabel?: string;
  checkpointToken?: string;
}): ExecutionSnapshot {
  const participantCount = input.participants.length;
  const contradictionRate = scoreContradictionRate(input.messageText);
  const driftScore = scoreDrift(
    `${input.messageText} ${input.toolCalls?.join(' ') ?? ''}`,
    participantCount,
  );
  const candidateOptions = buildCandidateOptions(input.messageText);
  const phaseLabel = input.phaseLabel ?? 'triage';

  return {
    scope: participantCount > 3 ? 'session' : 'episode',
    phase_label: phaseLabel,
    participants: input.participants,
    context_channels: input.contextChannels,
    retry_count: input.retryCount ?? 0,
    contradiction_rate: contradictionRate,
    drift_score: driftScore,
    candidate_options: candidateOptions,
    checkpoint_token: input.checkpointToken,
    observability_hints: {
      participant_budget_max: 4,
      minimum_viable_options: 2,
      required_phase_labels: ['triage', 'review'],
      phase_history: [phaseLabel],
      translation_conflict_detected: contradictionRate >= 0.35,
      contamination_risk_detected: driftScore >= 0.7,
      coherence_margin_low_detected:
        contradictionRate >= 0.4 || candidateOptions.length < 2,
      insufficient_stabilization_window_detected: input.messageText.length > 220,
      under_participation_detected: participantCount < 2,
      checkpoint_missing_detected: !input.checkpointToken,
    },
  };
}

export function runCoherenceCycle(
  snapshot: ExecutionSnapshot,
  options?: {
    flowId?: string;
    timestampMs?: number;
    capabilityMetadata?: BackendCapabilityMetadata;
  },
): RuntimeCycleResult {
  const timestampMs = options?.timestampMs ?? Date.now();
  const flowId = options?.flowId ?? `flow.internal-ops.${snapshot.scope}`;
  const protocolVersion = HC_PROTOCOL_VERSION;
  const capabilityMetadata =
    options?.capabilityMetadata ?? DEFAULT_CAPABILITY_METADATA;

  const alerts = analyzeSnapshot(snapshot, {
    flowId,
    timestampMs,
    protocolVersion,
  });
  alerts.forEach((alert) =>
    assertValid(conditionAlertValidator, alert, 'ConditionAlert'),
  );

  const controlSequences = alerts.map((alert, index) => {
    const sequence = buildControlSequence(alert, {
      protocolVersion,
      sequenceId: `control-sequence.${alert.alert_id}.${index + 1}`,
      createdAt: timestamp(timestampMs),
    });
    assertValid(controlSequenceValidator, sequence, 'ControlSequence');
    return sequence;
  });

  const controlResults = controlSequences.map((sequence, index) => {
    const result = resolveControlSequence(
      sequence,
      capabilityMetadata,
      `control-result.${sequence.source_alert_id}.${index + 1}`,
      timestamp(timestampMs),
      protocolVersion,
    );
    assertValid(controlResultValidator, result, 'ControlResult');
    return result;
  });

  const governorDecision = governExecutionState(snapshot, alerts, controlResults);

  return {
    alerts,
    control_sequences: controlSequences,
    control_results: controlResults,
    governor_decision: governorDecision,
    execution_controls: structuredClone(governorDecision.execution_controls),
  };
}

export function summarizeCycle(result: RuntimeCycleResult) {
  return {
    continueMode: result.governor_decision.continue_mode,
    alertIds: result.alerts.map((alert) => alert.alert_id),
    controlTypes: result.control_sequences.flatMap((sequence) =>
      sequence.controls.map((control) => control.control_type),
    ),
    reviewRequired:
      result.execution_controls.execution_gating.requires_review ?? false,
    paused: result.execution_controls.execution_gating.paused ?? false,
    schemaUrls: canonicalUrls,
  };
}

function analyzeSnapshot(
  snapshot: ExecutionSnapshot,
  options: { flowId: string; timestampMs: number; protocolVersion: string },
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
        CONTROL_ORDER_INDEX[
          ALERT_TO_CONTROL_TYPES[left.alert_id][0] as ControlType
        ] -
        CONTROL_ORDER_INDEX[
          ALERT_TO_CONTROL_TYPES[right.alert_id][0] as ControlType
        ],
    );
}

function buildAlert(
  alertId: AlertId,
  signalValue: number,
  snapshot: ExecutionSnapshot,
  options: { flowId: string; timestampMs: number; protocolVersion: string },
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
    emitted_at: timestamp(options.timestampMs),
    evidence: {
      signals: [{ signal: metadata.signalName, value: signalValue }],
      affected_components: ['internal-ops.coherence'],
      notes: metadata.conditionSummary,
    },
  };
}

function buildControlSequence(
  alert: ConditionAlert,
  options: { sequenceId: string; createdAt: Timestamp; protocolVersion: string },
): ControlSequence {
  const controls = [...ALERT_TO_CONTROL_TYPES[alert.alert_id]]
    .sort((left, right) => CONTROL_ORDER_INDEX[left] - CONTROL_ORDER_INDEX[right])
    .map((controlType) => ({
      control_type: controlType,
      constraints: defaultConstraints(alert, controlType),
    }));

  return {
    protocol_version: options.protocolVersion,
    flow_id: alert.flow_id,
    source_alert_id: alert.alert_id,
    sequence_id: options.sequenceId,
    controls,
    created_at: options.createdAt,
  };
}

function defaultConstraints(
  alert: ConditionAlert,
  controlType: ControlType,
): ControlConstraints {
  const base: ControlConstraints = {
    scope: alert.scope,
    reversibility: alert.reversibility,
    idempotence: alert.idempotence,
    boundedness: {},
  };

  if (controlType === 'timing') {
    base.boundedness = { max_delay_ms: 1200, timebox_ms: 15000 };
  }
  if (controlType === 'execution_gating') {
    base.boundedness = { max_retries: 1 };
  }
  if (controlType === 'recovery') {
    base.boundedness = { max_restart_depth: 1 };
  }

  return base;
}

function resolveControlSequence(
  sequence: ControlSequence,
  capabilityMetadata: BackendCapabilityMetadata,
  resultId: string,
  returnedAt: Timestamp,
  protocolVersion: string,
): ControlResult {
  const controlResults: ControlResult['control_results'] = [];
  const errors: NonNullable<ControlResult['errors']> = [];

  for (const control of sequence.controls) {
    const resolution = resolveControl(
      {
        flow_id: sequence.flow_id,
        sequence_id: sequence.sequence_id,
        result_id: resultId,
        returned_at: returnedAt,
      },
      control.control_type,
      control.constraints,
      capabilityMetadata,
      protocolVersion,
    );

    controlResults.push(...resolution.control_results);
    if (resolution.errors) {
      errors.push(...resolution.errors);
    }
  }

  const outcomes = controlResults.map((entry) => entry.outcome);
  const overallStatus: ControlResult['overall_status'] =
    outcomes.length > 0 && outcomes.every((outcome) => outcome === 'applied')
      ? 'applied'
      : outcomes.length > 0 && outcomes.every((outcome) => outcome !== 'applied')
        ? 'not_applied'
        : 'partially_applied';

  return {
    protocol_version: protocolVersion,
    flow_id: sequence.flow_id,
    sequence_id: sequence.sequence_id,
    result_id: resultId,
    overall_status: overallStatus,
    observed_scope: sequence.controls[0]?.constraints.scope ?? 'unknown',
    control_results: controlResults,
    ...(errors.length > 0 ? { errors } : {}),
    returned_at: returnedAt,
  };
}

function resolveControl(
  context: ControlResolutionContext,
  controlType: ControlType,
  constraints: ControlConstraints,
  capabilityMetadata: BackendCapabilityMetadata,
  protocolVersion: string,
): Pick<ControlResult, 'control_results' | 'errors'> {
  const primitive = capabilityMetadata.available_primitives[controlType]?.[0];

  if (!primitive) {
    return {
      control_results: [
        {
          control_type: controlType,
          outcome: 'skipped_unavailable',
          backend_observation: {
            bounds_enforced: false,
            details: 'No primitive family available.',
          },
        },
      ],
      errors: [
        {
          code: 'backend_unavailable',
          message: `${controlType} is unavailable`,
          control_type: controlType,
        },
      ],
    };
  }

  if (!primitive.properties.supported_scopes.includes(constraints.scope)) {
    return {
      control_results: [
        {
          control_type: controlType,
          outcome: 'skipped_incompatible',
          backend_observation: {
            bounds_enforced: false,
            details: `${primitive.primitive_family} does not support ${constraints.scope}.`,
          },
        },
      ],
      errors: [
        {
          code: 'scope_unavailable',
          message: `${constraints.scope} is not supported`,
          control_type: controlType,
        },
      ],
    };
  }

  return {
    control_results: [
      {
        control_type: controlType,
        outcome: 'applied',
        backend_observation: {
          bounds_enforced: true,
          details: `${primitive.primitive_family} selected.`,
          ...(primitive.properties.observability.emits_state_token
            ? { state_token: `${context.sequence_id}.${controlType}` }
            : {}),
        },
      },
    ],
    errors: undefined,
  };
}

function governExecutionState(
  snapshot: ExecutionSnapshot,
  alerts: ConditionAlert[],
  results: ControlResult[],
): CoherenceGovernorDecision {
  const controls: ExecutionControls = {
    execution_gating: {},
    timing: {},
    structure: {},
    participation: {},
    recovery: {},
  };

  const alertIds = new Set(alerts.map((alert) => alert.alert_id));
  const anyPartiallyApplied = results.some(
    (result) => result.overall_status === 'partially_applied',
  );

  const setParticipationMode = (
    mode: NonNullable<ExecutionControls['participation']['mode']>,
  ) => {
    const current = controls.participation.mode;
    if (
      current === undefined ||
      PARTICIPATION_MODE_PRECEDENCE[mode] >
        PARTICIPATION_MODE_PRECEDENCE[current]
    ) {
      controls.participation.mode = mode;
    }
  };

  const setGranularity = (
    granularity: NonNullable<ExecutionControls['structure']['granularity']>,
  ) => {
    const current = controls.structure.granularity;
    if (
      current === undefined ||
      STRUCTURE_GRANULARITY_PRECEDENCE[granularity] >
        STRUCTURE_GRANULARITY_PRECEDENCE[current]
    ) {
      controls.structure.granularity = granularity;
    }
  };

  if (alertIds.has('timing.insufficient-stabilization-window')) {
    controls.timing.delay_ms = 1200;
  }
  if (alertIds.has('timing.retry-thrash')) {
    controls.timing.backoff_ms = 1000;
  }
  if (alertIds.has('structure.phase-order-degraded')) {
    controls.structure.insert_review_phase = true;
  }
  if (alertIds.has('structure.granularity-mismatch')) {
    setGranularity('coarser');
  }
  if (alertIds.has('participation.over-participation-noise-saturation')) {
    setParticipationMode('restrict');
  }
  if (alertIds.has('participation.under-participation-missing-contributor')) {
    setParticipationMode('expand');
  }
  if (alertIds.has('context.weak-context-integration')) {
    controls.structure.insert_review_phase = true;
  }
  if (alertIds.has('context.contamination-risk')) {
    setParticipationMode('isolate');
  }
  if (
    alertIds.has('stability.coherence-margin-low') ||
    alertIds.has('structure.unbounded-iteration-risk')
  ) {
    controls.execution_gating.requires_review = true;
  }
  if (alertIds.has('stability.option-space-incomplete')) {
    setGranularity('finer');
  }
  if (alertIds.has('recovery.checkpoint-missing')) {
    controls.recovery.checkpoint_token = 'create-checkpoint';
  }
  if (alertIds.has('recovery.state-inconsistency-detected')) {
    controls.recovery.rollback_to_token =
      snapshot.checkpoint_token ?? 'latest-checkpoint';
  }

  let continueMode: CoherenceGovernorDecision['continue_mode'] = 'continue';
  if (alertIds.has('timing.retry-thrash')) {
    continueMode = 'rerun_bounded';
  }
  if (alertIds.has('context.contamination-risk') && anyPartiallyApplied) {
    continueMode = 'pause';
    controls.execution_gating.paused = true;
  }
  if (alertIds.has('recovery.irrecoverable-step-failure')) {
    continueMode = 'escalate';
  }

  return {
    execution_controls: controls,
    continue_mode: continueMode,
  };
}

function buildCandidateOptions(messageText: string) {
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

function scoreContradictionRate(messageText: string) {
  const normalized = messageText.toLowerCase();
  const conflicting = ['but', 'however', 'except', 'unless', 'although'];
  const hits = conflicting.filter((token) => normalized.includes(token)).length;
  return Math.min(0.15 + hits * 0.12, 0.85);
}

function scoreDrift(messageText: string, participantCount: number) {
  const lengthFactor = Math.min(messageText.length / 400, 0.5);
  const participantFactor = Math.min(Math.max(participantCount - 2, 0) * 0.12, 0.36);
  return Math.min(0.18 + lengthFactor + participantFactor, 0.95);
}

function loadSchema(schemaPath: string): object {
  return JSON.parse(readFileSync(schemaPath, 'utf-8')) as object;
}

function assertValid<T>(
  validator: ValidateFunction,
  payload: T,
  name: string,
) {
  if (!validator(payload)) {
    throw new Error(
      `${name} schema validation failed: ${JSON.stringify(
        validator.errors ?? [],
        null,
        2,
      )}`,
    );
  }
}

function timestamp(timestampMs: number): Timestamp {
  return {
    timestamp_ms: timestampMs,
    iso8601: new Date(timestampMs).toISOString(),
  };
}
