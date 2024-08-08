import { ActionWorkflow, ConnectionWorkflow } from '@/types/api/Workflow';
import { WorkspaceUser } from '@/types/api/Workspace';

/**
 * Repository type
 *
 * @typeParam id - Repository ID
 * @typeParam name - Name of the Repository
 * @typeParam slug - Slug of the Repository. Used by App router and to parse Queries
 * @typeParam description - Short description of the Repository
 * @typeParam documentation - Markdown documentation of the Repository. Allows for users to add explanations, examples, etc.
 * @typeParam workflow - The workflow (with workflowable) that has created this Repository. If created manually, this will be null
 * @typeParam immutable - If the Repository is immutable, it cannot be changed or updated
 * @typeParam owner - The user within the workspace that owns the Repository and is responsible for it
 * @typeParam tables - A list of human readable table names that are part of this Repository
 * @typeParam created_at - Timestamp of the creation of the Repository
 * @typeParam updated_at - Timestamp of the last update of the Repository
 */
export interface Repository {
  id: number;
  name: string;
  slug: string;
  description: string;
  documentation: string;
  workflow?: ConnectionWorkflow | ActionWorkflow | null;
  immutable: boolean;
  owner: WorkspaceUser;
  tables: string[];
  created_at: string;
  updated_at: string;
}
