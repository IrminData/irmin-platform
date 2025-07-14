import type { Connector } from '@/types/core/Connector';
import type { Tag } from '@/types/core/Tag';
import type { User } from '@/types/core/User';

/**
 * Represents a map of custom field values.
 */
export interface CustomFieldValues {
  /** Custom field key-value pairs */
  [key: string]: string;
}

/**
 * Irmin connection type
 */
export interface Connection {
  /** Unique identifier of the connection */
  id: string;
  /** Name of the connection */
  name: string;
  /** Description of the connection */
  description: string;
  /** Documentation for the connection */
  documentation: string;
  /** Custom details for the connection */
  details: CustomFieldValues;
  /** Custom settings for the connection */
  settings: CustomFieldValues;
  /** Owner of the connection */
  owner: User;
  /** Connector associated with the connection */
  connector: Connector;
  /** Tags associated with this connection */
  tags?: Tag[];
}
