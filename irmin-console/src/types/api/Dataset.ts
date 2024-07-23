import { Workflow } from './Workflow';

// This type will define the DB schema.
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
