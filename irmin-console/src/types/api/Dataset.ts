import { Workflow } from '@/types/api/Workflow';

/**
 * Dataset type
 * @typeParam id - Dataset ID
 * @typeParam name - Dataset name
 * @typeParam slug - Dataset slug
 * @typeParam description - Dataset description
 * @typeParam documentation - Dataset documentation
 * @typeParam workflow - Workflow that created this dataset
 * @typeParam tables - List of tables that are part of this dataset
 * @typeParam created_at - Dataset creation date
 * @typeParam updated_at - Dataset update date
 * @example See `/src/types/examples/apiObjects.ts`.ts - find object referencing this type
 */
export interface Dataset {
  id: number;
  name: string;
  slug: string; // Used to parse Actions and Queries in the future to target correct datasets
  description: string;
  documentation: string;
  workflow?: Workflow; // The workflow that has created this dataset. If created manually as a standalone dataset, this will be null
  tables: string[]; // A list of alias table names that are part of this dataset
  created_at: string;
  updated_at: string;
}
