import Fastify, { type FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { zodValidatorCompiler } from '../../routes/zod-validator.js';
import {
  createPatientDetailResponse,
  createPatientListItem,
} from '../clinic-shared/clinic-test-fixtures.js';

const { mockService } = vi.hoisted(() => ({
  mockService: {
    listPatients: vi.fn(),
    getPatient: vi.fn(),
    createPatient: vi.fn(),
    updatePatient: vi.fn(),
    reactivatePatient: vi.fn(),
    createWaitlistRequest: vi.fn(),
  },
}));

vi.mock('./patients.service.js', () => ({
  PatientsService: vi.fn().mockImplementation(() => mockService),
}));

async function buildPatientsApp() {
  const app = Fastify();
  app.setValidatorCompiler(zodValidatorCompiler);

  app.addHook('preHandler', async (request) => {
    const clinicRequest = request as FastifyRequest & {
      userId?: string;
      tenantRole?: string;
    };
    clinicRequest.userId = 'user-123';
    clinicRequest.tenantRole = 'viewer';
  });

  const { patientRoutes } = await import('./patients.routes.js');
  await app.register(patientRoutes);
  await app.ready();

  return app;
}

describe('patientRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses patient list filters from query strings before delegating to the service', async () => {
    mockService.listPatients.mockResolvedValue({
      patients: [
        createPatientListItem({
          isExisting: true,
          hasPendingForm: false,
        }),
      ],
      total: 1,
    });

    const app = await buildPatientsApp();
    const response = await app.inject({
      method: 'GET',
      url: '/tenants/tenant-1/patients?search=ana&isExisting=true&hasPendingForm=false&limit=5',
    });

    expect(response.statusCode).toBe(200);
    expect(mockService.listPatients).toHaveBeenCalledWith(
      'tenant-1',
      {
        search: 'ana',
        isExisting: true,
        hasPendingForm: false,
        limit: 5,
      },
      'viewer'
    );

    await app.close();
  });

  it('returns the full patient detail envelope for reactivation', async () => {
    mockService.reactivatePatient.mockResolvedValue(createPatientDetailResponse());

    const app = await buildPatientsApp();
    const response = await app.inject({
      method: 'POST',
      url: '/tenants/tenant-1/patients/patient-1/reactivate',
      payload: {
        source: 'campaign',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      patient: {
        id: 'patient-1',
      },
      identities: [
        {
          id: 'identity-1',
        },
      ],
    });

    await app.close();
  });
});
