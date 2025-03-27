/**
 * Irmin connector type
 */
export interface Connector {
  /** Unique identifier of the connector */
  id: string;
  /** Name of the connector */
  name: string;
  /** Description of the connector */
  description: string;
  /** Version of the connector */
  version: string;
  /** (optional) Structure version of the connector */
  structure_version?: string;
  /** Author of the connector */
  author: string;
  /** URL to the connector's logo */
  logo_url: string;
  /** Array of capabilities of the connector */
  capabilities: ConnectorCapability[];
  /** Array of locales supported by the connector */
  locales: string[];
  /** Array of categories associated with the connector */
  categories: ConnectorCategory[];
  /** Primary category of the connector */
  primary_category: ConnectorCategory;
  /** Author's email address */
  author_email: string;
  /** URL for more information about the connector */
  read_more_url: string;
}

/**
 * Represents the capabilities of a connector.
 */
export type ConnectorCapability =
  | 'pull'
  | 'push'
  | 'webhook_patch'
  | 'webhook_pull';

/**
 * Represents the category of a connector.
 */
export type ConnectorCategory =
  | 'database'
  | 'crm'
  | 'erp'
  | 'warehouse'
  | 'marketing'
  | 'analytics'
  | 'storage'
  | 'messaging'
  | 'payment'
  | 'social'
  | 'calendar'
  | 'project_management'
  | 'ecommerce'
  | 'iot'
  | 'monitoring'
  | 'other';

/**
 * Represents the validation result of a connector configuration.
 */
export interface ConnectorConfigurationValidationResult {
  /** Indicates if the configuration is valid */
  ok: boolean;
  /** Indicates if the connector can connect to the external system */
  can_connect: boolean;
  /** Indicates if the connection details are valid */
  connection_details_valid: boolean;
  /** Indicates if the connection settings are valid */
  connection_settings_valid: boolean;
}
