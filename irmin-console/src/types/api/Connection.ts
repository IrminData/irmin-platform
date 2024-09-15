import { Connector } from '@/types/api/Connector';
import { WorkspaceUser } from '@/types/api/Workspace';

/**
 * Connection object - used to store information on data sources and destinations
 *
 * @typeParam id - Connection ID
 * @typeParam name - Connection name
 * @typeParam slug - Connection slug
 * @typeParam owner - The workspace user that owns this connection and is responsible for it
 * @typeParam description - Connection description
 * @typeParam documentation - Connection documentation as a markdown string
 * @typeParam details - String which contains a JSON object
 * @typeParam settings - String which contains a JSON object
 * @typeParam connector - Connector object
 * @typeParam created_at - Connection creation date
 * @typeParam updated_at - Connection update date
 */
export interface Connection {
  id: number;
  name: string;
  slug: string;
  owner: WorkspaceUser;
  description: string;
  documentation: string;
  details: string;
  settings: string;
  connector: Connector;
  created_at: string;
  updated_at: string;
}
