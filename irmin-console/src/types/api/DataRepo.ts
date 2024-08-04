import { ActionWorkflow, ConnectionWorkflow } from '@/types/api/Workflow';
import { WorkspaceUser } from '@/types/api/Workspace';

/**
 * DataRepo type
 *
 * @see `@/src/types/examples/apiObjects.ts` - find object referencing this type to view example
 *
 * @typeParam id - DataRepo ID
 * @typeParam name - Name of the Data Repository
 * @typeParam slug - Slug of the Data Repository. Used by App router and to parse Queries
 * @typeParam description - Short description of the Data Repository
 * @typeParam documentation - Markdown documentation of the Data Repository. Allows for users to add explanations, examples, etc.
 * @typeParam workflow - The workflow (with workflowable) that has created this Data Repository. If created manually, this will be null
 * @typeParam owner - The user within the workspace that owns the Data Repository and is responsible for it
 * @typeParam tables - A list of alias table names that are part of this Data Repository
 * @typeParam created_at - Timestamp of the creation of the Data Repository
 * @typeParam updated_at - Timestamp of the last update of the Data Repository
 */
export interface DataRepo {
  id: number;
  name: string;
  slug: string;
  description: string;
  documentation: string;
  workflow?: ConnectionWorkflow | ActionWorkflow | null;
  owner: WorkspaceUser;
  tables: string[];
  created_at: string;
  updated_at: string;
}
