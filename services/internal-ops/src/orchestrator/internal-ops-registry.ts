import {
  db,
  internalAgentProfiles,
  internalAgentRelationships,
  internalCapabilityBindings,
} from '@agentmou/db';
import { and, eq } from 'drizzle-orm';

import type { OpenClawRunner } from '../openclaw/openclaw-runner.js';
import {
  DEFAULT_INTERNAL_CAPABILITY_BINDINGS,
  INTERNAL_AGENT_PROFILES,
  INTERNAL_AGENT_RELATIONSHIPS,
  INTERNAL_OPENCLAW_CAPABILITIES,
} from '../org-registry.js';

export class InternalOpsRegistrySynchronizer {
  private synced = false;

  constructor(
    private readonly tenantId: string,
    private readonly runner: OpenClawRunner,
  ) {}

  async sync() {
    if (this.synced) {
      return;
    }

    for (const profile of INTERNAL_AGENT_PROFILES) {
      await db
        .insert(internalAgentProfiles)
        .values({
          id: profile.id,
          tenantId: this.tenantId,
          roleTitle: profile.roleTitle,
          department: profile.department,
          mission: profile.mission,
          parentAgentId: profile.parentAgentId,
          kpis: profile.kpis,
          allowedTools: profile.allowedTools,
          allowedCapabilities: profile.allowedCapabilities,
          allowedWorkflowTags: profile.allowedWorkflowTags,
          memoryScope: profile.memoryScope,
          riskBudget: profile.riskBudget,
          participantBudget: profile.participantBudget,
          maxDelegationDepth: profile.maxDelegationDepth,
          escalationPolicy: profile.escalationPolicy,
          playbooks: profile.playbooks,
        })
        .onConflictDoNothing({ target: internalAgentProfiles.id });
    }

    for (const relationship of INTERNAL_AGENT_RELATIONSHIPS) {
      const [existingRelationship] = await db
        .select()
        .from(internalAgentRelationships)
        .where(
          and(
            eq(internalAgentRelationships.tenantId, this.tenantId),
            eq(
              internalAgentRelationships.parentAgentId,
              relationship.parentAgentId,
            ),
            eq(
              internalAgentRelationships.childAgentId,
              relationship.childAgentId,
            ),
          ),
        );

      if (!existingRelationship) {
        await db.insert(internalAgentRelationships).values({
          tenantId: this.tenantId,
          parentAgentId: relationship.parentAgentId,
          childAgentId: relationship.childAgentId,
          relationship: relationship.relationship,
        });
      }
    }

    for (const binding of DEFAULT_INTERNAL_CAPABILITY_BINDINGS) {
      const [existingBinding] = await db
        .select()
        .from(internalCapabilityBindings)
        .where(
          and(
            eq(internalCapabilityBindings.tenantId, this.tenantId),
            eq(internalCapabilityBindings.capabilityKey, binding.capabilityKey),
          ),
        );

      if (!existingBinding) {
        await db.insert(internalCapabilityBindings).values({
          tenantId: this.tenantId,
          capabilityKey: binding.capabilityKey,
          title: binding.title,
          description: binding.description,
          targetType: binding.targetType,
          enabled: binding.enabled,
          config: binding.config,
        });
      }
    }

    await this.runner.registerAgentProfiles(this.tenantId, INTERNAL_AGENT_PROFILES);
    await this.runner.registerCapabilities(
      this.tenantId,
      INTERNAL_OPENCLAW_CAPABILITIES,
    );

    this.synced = true;
  }
}
