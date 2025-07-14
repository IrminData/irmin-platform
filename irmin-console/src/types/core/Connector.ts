/**
 * Irmin connector type
 */
export interface Connector {
  /** ID is a unique SQID identifier of the connector */
  id: string;
  /** Name of the connector */
  name: string;
  /** Short description of the connector */
  description: string;
  /** Current version of the connector (provided by the connector author) */
  version: string;
  /** Version of the Irmin Connector Structure this connector adheres to (e.g. which connector guideline version the connector is based on) */
  structure_version: string;
  /** Name of the author of the connector */
  author: string;
  /** URL to the connector's logo image */
  logo_url: string;
  /** List of capabilities supported by the connector, eg. what kind of operations the connector can perform */
  capabilities: ConnectorCapability[];
  /** List of locales supported by the connector, eg. what languages the connector supports */
  locales: string[];
  /** Array of categories associated with the connector, eg. what kind of connector it is */
  categories: ConnectorCategory[];
  /** Primary category of the connector */
  primary_category: ConnectorCategory;
  /** Email address of the author, eg. who to contact if there are any issues with the connector */
  author_email: string;
  /** URL to read more about the connector, eg. a website where the connector is described, such as documentation */
  read_more_url: string;
}

/**
 * Represents the capabilities of a connector.
 *
 * 'pull' means that data files can be pulled from different paths in the connector
 * 'push' means that data files can be pushed to different paths in the connector
 * 'push_patch' means that JSON Patch based change sets can be pushed to the connector
 * 'event_webhook' means that the connector can send webhook notifications when something changes in the underlying data
 */
type ConnectorCapability = 'event_webhook' | 'pull' | 'push_patch' | 'push';

/**
 * Represents the category of a connector.
 */
export type ConnectorCategory =
  | 'analytics'
  | 'calendar'
  | 'crm'
  | 'database'
  | 'ecommerce'
  | 'erp'
  | 'iot'
  | 'marketing'
  | 'messaging'
  | 'monitoring'
  | 'other'
  | 'payment'
  | 'project_management'
  | 'social'
  | 'storage'
  | 'warehouse';

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
  /** (optional) Array of validation errors */
  errors?: string[];
}
