import { Connector } from '@/types/core/Connector';
import { User } from '@/types/core/User';

/**
 * Connection object - used to store information on data sources and destinations
 */
export interface Connection {
  /** Connection hash ID */
  id: string;
  /** Connection name */
  name: string;
  /** The workspace user that owns this connection and is responsible for it */
  owner: User;
  /** Connection description */
  description: string;
  /** Connection documentation as a markdown string */
  documentation: string;
  /** String which contains a JSON object */
  details: string;
  /** String which contains a JSON object */
  settings: string;
  /** Connector object */
  connector: Connector;
  /** Connection creation date */
  created_at: string;
  /** Connection update date */
  updated_at: string;
}
