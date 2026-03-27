import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  selectWhereMock,
  selectFromMock,
  selectMock,
  deleteWhereMock,
  deleteMock,
  updateWhereMock,
  updateSetMock,
  updateMock,
  eqMock,
  andMock,
  mapConnectorMock,
  recordAuditEventMock,
  connectorAccountsMock,
} = vi.hoisted(() => ({
  selectWhereMock: vi.fn(),
  selectFromMock: vi.fn(),
  selectMock: vi.fn(),
  deleteWhereMock: vi.fn(),
  deleteMock: vi.fn(),
  updateWhereMock: vi.fn(),
  updateSetMock: vi.fn(),
  updateMock: vi.fn(),
  eqMock: vi.fn((field: unknown, value: unknown) => ({ field, value })),
  andMock: vi.fn((...conditions: unknown[]) => conditions),
  mapConnectorMock: vi.fn((connector: { provider: string; status: string }) => ({
    id: connector.provider,
    status: connector.status,
  })),
  recordAuditEventMock: vi.fn(),
  connectorAccountsMock: {
    id: 'id',
    tenantId: 'tenantId',
    provider: 'provider',
    lastTestAt: 'lastTestAt',
  },
}));

selectFromMock.mockImplementation(() => ({ where: selectWhereMock }));
selectMock.mockImplementation(() => ({ from: selectFromMock }));
deleteMock.mockImplementation(() => ({ where: deleteWhereMock }));
updateSetMock.mockImplementation(() => ({ where: updateWhereMock }));
updateMock.mockImplementation(() => ({ set: updateSetMock }));

vi.mock('@agentmou/db', () => ({
  db: {
    select: selectMock,
    delete: deleteMock,
    update: updateMock,
  },
  connectorAccounts: connectorAccountsMock,
}));

vi.mock('drizzle-orm', () => ({
  eq: eqMock,
  and: andMock,
}));

vi.mock('../connectors.mapper.js', () => ({
  mapConnector: mapConnectorMock,
}));

vi.mock('../../../lib/audit.js', () => ({
  recordAuditEvent: recordAuditEventMock,
}));

import { ConnectorsService } from '../connectors.service.js';

describe('ConnectorsService', () => {
  const connectorRow = {
    id: '4d5b7426-38f8-46cb-b7d3-c274edc11daa',
    tenantId: 'tenant-123',
    provider: 'gmail',
    status: 'connected',
    scopes: [],
    lastTestAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    selectWhereMock.mockResolvedValue([connectorRow]);
    deleteWhereMock.mockResolvedValue(undefined);
    updateWhereMock.mockResolvedValue(undefined);
  });

  it('looks up connector rows by uuid when the identifier is a uuid', async () => {
    const service = new ConnectorsService();
    const connectorId = '123e4567-e89b-42d3-a456-426614174000';

    const connector = await service.getConnector('tenant-123', connectorId);

    expect(connector).toEqual({ id: 'gmail', status: 'connected' });
    expect(eqMock).toHaveBeenCalledWith(connectorAccountsMock.tenantId, 'tenant-123');
    expect(eqMock).toHaveBeenCalledWith(connectorAccountsMock.id, connectorId);
    expect(eqMock).not.toHaveBeenCalledWith(connectorAccountsMock.provider, connectorId);
    expect(andMock).toHaveBeenCalledWith(
      { field: connectorAccountsMock.tenantId, value: 'tenant-123' },
      { field: connectorAccountsMock.id, value: connectorId }
    );
  });

  it('deletes connector rows by provider slug without comparing the slug to the uuid column', async () => {
    const service = new ConnectorsService();

    await service.deleteConnector('tenant-123', 'gmail', 'user-123');

    expect(eqMock).toHaveBeenCalledWith(connectorAccountsMock.provider, 'gmail');
    expect(eqMock).not.toHaveBeenCalledWith(connectorAccountsMock.id, 'gmail');
    expect(deleteWhereMock).toHaveBeenCalledWith({
      field: connectorAccountsMock.id,
      value: connectorRow.id,
    });
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-123',
        actorId: 'user-123',
        action: 'connector.deleted',
        details: {
          connectorId: connectorRow.id,
          provider: 'gmail',
        },
      })
    );
  });

  it('tests connector connections by provider slug and updates the concrete row id', async () => {
    const service = new ConnectorsService();

    const result = await service.testConnection('tenant-123', 'gmail', 'user-123');

    expect(result).toEqual({
      success: true,
      message: 'Connection successful',
    });
    expect(eqMock).toHaveBeenCalledWith(connectorAccountsMock.provider, 'gmail');
    expect(eqMock).not.toHaveBeenCalledWith(connectorAccountsMock.id, 'gmail');
    expect(updateWhereMock).toHaveBeenCalledWith({
      field: connectorAccountsMock.id,
      value: connectorRow.id,
    });
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-123',
        actorId: 'user-123',
        action: 'connector.tested',
        details: {
          connectorId: connectorRow.id,
          provider: 'gmail',
        },
      })
    );
  });
});
