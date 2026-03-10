// Connectors Package - Abstractions for external services
import { BaseConnector } from './base';
import { GmailConnector } from './gmail';

export { BaseConnector, type ConnectorConfig } from './base';
export { GmailConnector, type GmailConfig } from './gmail';
export { encrypt, decrypt } from './crypto';

// Connector types to be implemented
export type ConnectorType = 
  | 'gmail'
  | 'slack'
  | 'drive'
  | 'salesforce'
  | 'hubspot'
  | 'notion'
  | 'linear'
  | 'github'
  | 'calendly'
  | 'intercom'
  | 'zendesk';

type ConnectorConstructor = new (...args: any[]) => BaseConnector;

export interface ConnectorRegistry {
  getConnector(type: ConnectorType): ConnectorConstructor | undefined;
  registerConnector(type: ConnectorType, connector: ConnectorConstructor): void;
  listConnectors(): ConnectorType[];
}

class InMemoryConnectorRegistry implements ConnectorRegistry {
  private connectors = new Map<ConnectorType, ConnectorConstructor>();

  getConnector(type: ConnectorType): ConnectorConstructor | undefined {
    return this.connectors.get(type);
  }

  registerConnector(type: ConnectorType, connector: ConnectorConstructor): void {
    this.connectors.set(type, connector);
  }

  listConnectors(): ConnectorType[] {
    return Array.from(this.connectors.keys());
  }
}

export const connectorRegistry: ConnectorRegistry = new InMemoryConnectorRegistry();

// Register built-in connectors
connectorRegistry.registerConnector('gmail', GmailConnector);
