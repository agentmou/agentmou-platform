export interface ConnectorConfig {
  name: string;
  credentials: Record<string, string>;
  settings?: Record<string, unknown>;
}

export abstract class BaseConnector {
  protected config: ConnectorConfig;

  constructor(config: ConnectorConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract healthCheck(): Promise<boolean>;
}
