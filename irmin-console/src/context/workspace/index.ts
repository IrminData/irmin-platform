import { useWorkspace } from './useWorkspace';
import WorkspaceContext from './WorkspaceContext';
import {
  useDeleteCurrentWorkspace,
  useFetchActions,
  useFetchConnections,
  useFetchDashboards,
  useFetchDatasets,
  useFetchExports,
  useFetchRoles,
  useFetchWorkspaces,
  useSwitchWorkspace,
} from './workspaceHooks';
import { WorkspaceProvider } from './WorkspaceProvider';

/**
 * Export all workspace context functionality
 */
export {
  useWorkspace,
  WorkspaceContext,
  useFetchDashboards,
  useFetchConnections,
  useFetchActions,
  useFetchExports,
  useFetchDatasets,
  useFetchRoles,
  useFetchWorkspaces,
  useSwitchWorkspace,
  useDeleteCurrentWorkspace,
  WorkspaceProvider,
};
