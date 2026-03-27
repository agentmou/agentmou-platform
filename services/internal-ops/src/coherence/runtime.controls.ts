import type {
  BackendCapabilityMetadata,
  CoherenceGovernorDecision,
  ConditionAlert,
  ControlConstraints,
  ControlResolutionContext,
  ControlResult,
  ControlSequence,
  ControlType,
  ExecutionControls,
  ExecutionSnapshot,
  Timestamp,
} from 'hc-coherence';

import {
  ALERT_TO_CONTROL_TYPES,
  CONTROL_ORDER_INDEX,
  PARTICIPATION_MODE_PRECEDENCE,
  STRUCTURE_GRANULARITY_PRECEDENCE,
} from './runtime.constants.js';

export function buildControlSequence(
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

export function resolveControlSequence(
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

export function governExecutionState(
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

function resolveControl(
  context: ControlResolutionContext,
  controlType: ControlType,
  constraints: ControlConstraints,
  capabilityMetadata: BackendCapabilityMetadata,
  _protocolVersion: string,
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
