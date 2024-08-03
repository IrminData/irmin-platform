import { Workflow } from '@/types/api/Workflow';

/**
 * DataRepo type
 * @typeParam id - DataRepo ID
 * @typeParam name - DataRepo name
 * @typeParam slug - DataRepo slug
 * @typeParam description - DataRepo description
 * @typeParam documentation - DataRepo documentation
 * @typeParam workflow - Workflow that created this dataRepo
 * @typeParam tables - List of tables that are part of this dataRepo
 * @typeParam created_at - DataRepo creation date
 * @typeParam updated_at - DataRepo update date
 * @example See `/src/types/examples/apiObjects.ts`.ts - find object referencing this type
 */
export interface DataRepo {
  id: number;
  name: string;
  slug: string; // Used to parse Actions and Queries in the future to target correct dataRepositories
  description: string;
  documentation: string;
  workflow?: Workflow; // The workflow that has created this dataRepo. If created manually as a standalone dataRepo, this will be null
  tables: string[]; // A list of alias table names that are part of this dataRepo
  created_at: string;
  updated_at: string;
}
