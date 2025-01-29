/**
 * Connector general information object.
 */
export interface Connector {
  /** Unique ID of the connector */
  id: string;
  /** Name of the connector */
  name: string;
  /** Short description of the connector */
  description: string;
  /** Current version of the connector */
  version: string;
  /** Version of the Irmin Connector Structure this connector adheres to */
  structure_version: string;
  /** Name of the author of the connector */
  author: string;
  /** Base URL for the connector's REST API */
  api_base_url: string;
  /** URL to the connector's logo image */
  logo_url: string;
  /** List of capabilities supported by the connector */
  capabilities: ConnectorCapability[];
  /** List of locales supported by the connector */
  locales: string[];
  /** (optional) Primary category of the connector. */
  primary_category?: ConnectorCategory;
  /** (optional) List of categories the connector belongs to. */
  categories?: ConnectorCategory[];
  /** (optional) Email address of the author */
  author_email?: string;
  /** (optional) Markdown-formatted text providing more details about the connector */
  documentation?: string;
  /** (optional) URL to read more about the connector, such as documentation */
  read_more_url?: string;
}

/**
 * Connector capability options, describing the features the connector supports.
 */
export enum ConnectorCapability {
  /** Can perform operation `pull` */
  Pull = 'pull',
  /** Can perform operation `push` */
  Push = 'push',
  /** Can send webhook events */
  Event = 'event',
}

/**
 * Connector category options, describing the type of service the connector is for.
 */
export enum ConnectorCategory {
  Database = 'database',
  CRM = 'crm',
  ERP = 'erp',
  Warehouse = 'warehouse',
  Marketing = 'marketing',
  Analytics = 'analytics',
  Storage = 'storage',
  Messaging = 'messaging',
  Payment = 'payment',
  Social = 'social',
  Calendar = 'calendar',
  ProjectManagement = 'project_management',
  ECommerce = 'ecommerce',
  IoT = 'iot',
  Monitoring = 'monitoring',
  Other = 'other',
}

/**
 * Connector configuration validation result object.
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
  /** List of errors encountered during validation */
  errors: string[] | null;
}
