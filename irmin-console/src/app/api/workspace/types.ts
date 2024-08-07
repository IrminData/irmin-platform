import { Dashboard } from '@/types/api/Dashboard';
import { Invite } from '@/types/api/Invite';
import { Repository } from '@/types/api/Repository';
import {
  ActionWorkflow,
  ConnectionWorkflow,
  ExportWorkflow,
} from '@/types/api/Workflow';
import { WorkspaceUser } from '@/types/api/Workspace';

/**
 * @typeParam dashboards - {@link Dashboard} objects
 * @typeParam connections - {@link ConnectionWorkflow} objects
 * @typeParam exports - {@link ExportWorkflow} objects
 * @typeParam actions - {@link ActionWorkflow} objects
 * @typeParam repositories - {@link Repository} objects
 * @typeParam users - {@link WorkspaceUser} objects
 * @typeParam invites - {@link Invite} objects
 */
export interface WorkspaceProxyData {
  dashboards: Dashboard[];
  connections: ConnectionWorkflow[];
  exports: ExportWorkflow[];
  actions: ActionWorkflow[];
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
    dashboards: [],
    connections: [],
    exports: [],
    actions: [],
    repositories: [],
    users: [],
    invites: [],
  },
  metadata: {
    errors: [],
    workspace: '',
  },
};
