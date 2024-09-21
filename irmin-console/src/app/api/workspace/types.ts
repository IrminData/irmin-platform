import { Connection } from '@/types/core/Connection';
import { Invite } from '@/types/core/Invite';
import { Repository } from '@/types/core/Repository';
import {
  ActionWorkflow,
  ExportWorkflow,
  ImportWorkflow,
} from '@/types/core/Workflow';
import { WorkspaceUser } from '@/types/core/Workspace';

/**
 * Data object for the workspace proxy response
 * @typeParam imports - {@link ImportWorkflow} objects
 * @typeParam exports - {@link ExportWorkflow} objects
 * @typeParam actions - {@link ActionWorkflow} objects
 * @typeParam connections - {@link Connection} objects
 * @typeParam repositories - {@link Repository} objects
 * @typeParam users - {@link WorkspaceUser} objects
 * @typeParam invites - {@link Invite} objects
 */
export interface WorkspaceProxyData {
  imports: ImportWorkflow[];
  exports: ExportWorkflow[];
  actions: ActionWorkflow[];
  connections: Connection[];
  repositories: Repository[];
  users: WorkspaceUser[];
  invites: Invite[];
}

/**
 * Response object type for the `GET /api/workspace` route
 * @typeParam data - The fetched data {@link WorkspaceProxyData}
 * @typeParam data - The fetched data
 * @typeParam metadata - Additional data about the fetch
 * @typeParam metadata.errors - Errors that occurred during the fetch
 * @typeParam metadata.errors.error - The error object
 * @typeParam metadata.errors.object - The object that the error occurred on
 * @typeParam metadata.workspace - Slug of the workspace data was fetched for
 */
export interface WorkspaceProxyResponse {
  data: WorkspaceProxyData;
  metadata: {
    errors: {
      error: Error;
      object: keyof WorkspaceProxyData;
    }[];
    workspace: string;
  };
}

/**
 * Empty {@link WorkspaceProxyResponse} object to use as a base for the response
 */
export const emptyWorkspaceProxyResponse: WorkspaceProxyResponse = {
  data: {
    imports: [],
    exports: [],
    actions: [],
    connections: [],
    repositories: [],
    users: [],
    invites: [],
  },
  metadata: {
    errors: [],
    workspace: '',
  },
};
