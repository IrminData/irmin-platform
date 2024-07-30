import { useFetchActions } from '@/context/workspace/hooks/actions';
import { useFetchConnections } from '@/context/workspace/hooks/connections';
import { useFetchDashboards } from '@/context/workspace/hooks/dashboards';
import { useFetchDatasets } from '@/context/workspace/hooks/datasets';
import { useFetchExports } from '@/context/workspace/hooks/exports';
import {
  useCancelInvite,
  useChangeInvite,
  useFetchInvites,
  useResendInvite,
  useSendInvite,
} from '@/context/workspace/hooks/invite';
import {
  useChangeUserRole,
  useDeleteUser,
  useFetchRoles,
  useFetchUsers,
} from '@/context/workspace/hooks/usersAndRoles';
import {
  useDeleteCurrentWorkspace,
  useFetchWorkspaces,
  useSwitchWorkspace,
  useTransferOwnership,
} from '@/context/workspace/hooks/workspaces';
import {
  useWorkspace,
  WorkspaceContext,
} from '@/context/workspace/WorkspaceContext';
import { WorkspaceProvider } from '@/context/workspace/WorkspaceProvider';

/**
 * Export all workspace context functionality
 */
export {
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
  // Hooks
  useSwitchWorkspace,
  useTransferOwnership,
  useWorkspace,
  // Context
  WorkspaceContext,
  WorkspaceProvider,
};
