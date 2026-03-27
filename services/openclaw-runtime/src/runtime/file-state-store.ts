import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  OpenClawStateStore,
  OpenClawStorageConfig,
  StoredRemoteSession,
  StoredTenantRegistry,
} from './state-store.js';

const DEFAULT_STORAGE_CONFIG: OpenClawStorageConfig = {
  mode: 'file',
  stateDir: './.openclaw-state',
};

export class FileStateStore implements OpenClawStateStore {
  private readonly stateDir: string;

  constructor(config: OpenClawStorageConfig | string = DEFAULT_STORAGE_CONFIG) {
    const stateDir =
      typeof config === 'string' ? config : resolveStateDir(config);
    this.stateDir = path.resolve(stateDir);
  }

  async initialize() {
    await mkdir(this.tenantsDir(), { recursive: true });
    await mkdir(this.sessionsDir(), { recursive: true });
  }

  async loadTenantRegistry(tenantId: string) {
    return this.readJson<StoredTenantRegistry>(this.tenantRegistryPath(tenantId));
  }

  async saveTenantRegistry(registry: StoredTenantRegistry) {
    await this.writeJson(this.tenantRegistryPath(registry.tenantId), registry);
  }

  async loadSession(remoteSessionId: string) {
    return this.readJson<StoredRemoteSession>(this.sessionPath(remoteSessionId));
  }

  async saveSession(session: StoredRemoteSession) {
    await this.writeJson(this.sessionPath(session.remoteSessionId), session);
  }

  private tenantsDir() {
    return path.join(this.stateDir, 'tenants');
  }

  private sessionsDir() {
    return path.join(this.stateDir, 'sessions');
  }

  private tenantRegistryPath(tenantId: string) {
    return path.join(this.tenantsDir(), `${tenantId}.json`);
  }

  private sessionPath(remoteSessionId: string) {
    return path.join(this.sessionsDir(), `${remoteSessionId}.json`);
  }

  private async readJson<T>(filePath: string): Promise<T | null> {
    try {
      const contents = await readFile(filePath, 'utf8');
      return JSON.parse(contents) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  private async writeJson(filePath: string, value: unknown) {
    await mkdir(path.dirname(filePath), { recursive: true });

    const tempPath = `${filePath}.tmp`;
    await writeFile(tempPath, JSON.stringify(value, null, 2), 'utf8');
    await rename(tempPath, filePath);
  }
}

function resolveStateDir(config: OpenClawStorageConfig) {
  if (config.mode !== 'file') {
    throw new Error(`Unsupported OpenClaw storage mode: ${config.mode}`);
  }

  return config.stateDir;
}
