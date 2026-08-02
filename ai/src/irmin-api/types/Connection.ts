import type { Connector } from './Connector';
import type { Tag } from './Tag';
import type { User } from './user';

/**
 * Represents a map of custom field values.
 */
interface ConnectionFieldValues {
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
  details: ConnectionFieldValues;
  /** Custom settings for the connection */
  settings: ConnectionFieldValues;
  /** Owner of the connection */
  owner: User;
  /** Connector associated with the connection */
  connector: Connector;
  /** Tags associated with this connection */
  tags?: Tag[];
}
