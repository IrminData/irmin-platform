/**
 * Connector type
 *
 * @typeParam id - Connector ID
 * @typeParam name - Connector name
 * @typeParam logo - Connector logo
 * @typeParam description - Connector description
 */
export interface Connector {
  id: number;
  name: string;
  logo: string;
  description: string;
}

/**
 * List of Details or Settings fields required to create a connection
 *
 * @typeParam key - Field name
 * @typeParam value - Field type
 */
export interface ConnectionDetailsAndSettingsFields {
  [key: string]: 'text' | 'password' | 'number' | 'integer' | 'float';
}

/**
 * Connection details and settings
 *
 * @typeParam key - Field name
 * @typeParam value - Field value
 */
export interface ConnectionDetailsAndSettings {
  [key: string]: string | number;
}
