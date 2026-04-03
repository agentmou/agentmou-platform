import { beforeEach, describe, expect, it, vi } from 'vitest';

const { eqMock, andMock, descMock, inArrayMock } = vi.hoisted(() => ({
  eqMock: vi.fn(),
  andMock: vi.fn(),
  descMock: vi.fn(),
  inArrayMock: vi.fn(),
}));

vi.mock('drizzle-orm', () => ({
  eq: eqMock,
  and: andMock,
  desc: descMock,
  inArray: inArrayMock,
}));

import { ReactivationRepository } from './reactivation.repository.js';

function createUpdateReturning<T>(result: T) {
  return {
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue(result),
      })),
    })),
  };
}

function createWhereLimitResult<T>(result: T) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue(result),
      })),
    })),
  };
}

function createWhereResult<T>(result: T) {
  return {
    from: vi.fn(() => ({
      where: vi.fn().mockResolvedValue(result),
    })),
  };
}

describe('ReactivationRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('materializes campaign recipients from the audience definition when starting', async () => {
    const now = new Date('2025-01-15T09:00:00.000Z');
    const campaign = {
      id: 'campaign-1',
      tenantId: 'tenant-1',
      name: 'Recall',
      campaignType: 'recall',
      status: 'running',
      audienceDefinition: {
        patientIds: ['patient-1'],
      },
      messageTemplate: {},
      channelPolicy: {},
      scheduledAt: null,
      startedAt: now,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const patient = {
      id: 'patient-1',
      tenantId: 'tenant-1',
      externalPatientId: null,
      status: 'inactive',
      isExisting: true,
      firstName: 'Ana',
      lastName: 'Garcia',
      fullName: 'Ana Garcia',
      phone: null,
      email: null,
      dateOfBirth: null,
      notes: null,
      consentFlags: {},
      source: 'manual',
      lastInteractionAt: null,
      nextSuggestedActionAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const valuesMock = vi.fn().mockResolvedValue(undefined);

    const repository = new ReactivationRepository({
      update: vi.fn().mockReturnValue(createUpdateReturning([campaign])),
      select: vi
        .fn()
        .mockReturnValueOnce(createWhereLimitResult([]))
        .mockReturnValueOnce(createWhereResult([patient])),
      insert: vi.fn(() => ({
        values: valuesMock,
      })),
    } as never);

    const startedCampaign = await repository.startCampaign('tenant-1', 'campaign-1', {});

    expect(startedCampaign?.status).toBe('running');
    expect(valuesMock).toHaveBeenCalledWith([
      expect.objectContaining({
        tenantId: 'tenant-1',
        campaignId: 'campaign-1',
        patientId: 'patient-1',
        status: 'pending',
      }),
    ]);
  });
});
