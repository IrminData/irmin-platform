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
