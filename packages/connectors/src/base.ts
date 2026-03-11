/**
 * Shared configuration object passed to connector implementations.
 */
export interface ConnectorConfig {
  name: string;
  credentials: Record<string, string>;
  settings?: Record<string, unknown>;
}

/**
 * Base contract that every runtime connector implementation must satisfy.
 */
export abstract class BaseConnector {
  protected config: ConnectorConfig;

  constructor(config: ConnectorConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract healthCheck(): Promise<boolean>;
}
