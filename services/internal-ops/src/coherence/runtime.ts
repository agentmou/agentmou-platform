import { readFileSync } from 'node:fs';

import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {
  canonicalUrls,
  localArtifacts,
  type BackendCapabilityMetadata,
  type ExecutionSnapshot,
  type RuntimeCycleResult,
  type Timestamp,
} from 'hc-coherence';

import { analyzeSnapshot, buildCandidateOptions, scoreContradictionRate, scoreDrift } from './runtime.analysis.js';
import {
  DEFAULT_CAPABILITY_METADATA,
  HC_PROTOCOL_VERSION,
} from './runtime.constants.js';
import {
  buildControlSequence,
  governExecutionState,
  resolveControlSequence,
} from './runtime.controls.js';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const conditionAlertValidator = ajv.compile(
  loadSchema(localArtifacts.conditionAlert),
);
const controlSequenceValidator = ajv.compile(
  loadSchema(localArtifacts.controlSequence),
);
const controlResultValidator = ajv.compile(loadSchema(localArtifacts.controlResult));

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
    timestamp,
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
