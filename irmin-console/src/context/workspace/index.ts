import { useWorkspace } from '@/context/workspace/useWorkspace';
import WorkspaceContext from '@/context/workspace/WorkspaceContext';
import {
  useCancelInvite,
  useChangeInvite,
  useChangeUserRole,
  useDeleteCurrentWorkspace,
  useDeleteUser,
  useFetchActions,
  useFetchConnections,
  useFetchDashboards,
  useFetchDatasets,
  useFetchExports,
  useFetchInvites,
  useFetchRoles,
  useFetchUsers,
  useFetchWorkspaces,
  useResendInvite,
  useSendInvite,
  useSwitchWorkspace,
  useTransferOwnership,
} from '@/context/workspace/workspaceHooks';
import { WorkspaceProvider } from '@/context/workspace/WorkspaceProvider';

/**
 * Export all workspace context functionality
 */
export {
  WorkspaceContext,
  WorkspaceProvider,
  useWorkspace,
  useSwitchWorkspace,
  useDeleteCurrentWorkspace,
  useTransferOwnership,
  useFetchWorkspaces,
  useFetchDashboards,
  useFetchConnections,
  useFetchActions,
  useFetchExports,
  useFetchDatasets,
  useFetchRoles,
  useFetchUsers,
  useFetchInvites,
  useDeleteUser,
  useChangeUserRole,
  useSendInvite,
  useResendInvite,
  useCancelInvite,
  useChangeInvite,
};
