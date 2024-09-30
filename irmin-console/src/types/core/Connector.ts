/**
 * Connector type
 *
 * @typeParam id - Connector ID
 * @typeParam name - Connector name
 * @typeParam logo - Connector logo
 * @typeParam description - Connector description
 * @typeParam category - Connector category (e.g. Database, CRM, etc.)
 * @typeParam url - URL to read more and the connector documentation
 */
export interface Connector {
  id: string;
  name: string;
  logo: string;
  description: string;
  category: string;
  url?: string;
}
