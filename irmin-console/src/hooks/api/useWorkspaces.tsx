import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  workspacesQueryKey,
  workspaceSummariesQueryKey,
} from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { Workspace, WorkspaceSummary } from '@/types/core/Workspace';

import { createMutationHandlers } from './mutations/utils';

type CreateWorkspaceInput = Pick<Workspace, 'description' | 'name'>;

/**
 * Hook for the full workspaces list query (used by ConsoleWrapper, search, etc.)
 */
export function useWorkspaces() {
  const { getCore } = useIrminCore();

  // Query for fetching all workspaces
  const workspacesQuery = useQuery<IrminAPIResponse<Workspace[]>>({
    queryKey: workspacesQueryKey,
    queryFn: async () => {
      const core = await getCore();
      const workspaces = await core.workspaceService.fetchWorkspaces();
      return workspaces;
    },
  });

  return {
    workspacesQuery,
  };
}

/**
 * Hook for the workspace create mutation.
 *
 * Separated from useWorkspaces so consumers that only need to create a
 * workspace don't trigger the full workspaces list query.
 */
export function useWorkspaceActions() {
  const { getCore } = useIrminCore();
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const queryClient = useQueryClient();

  // Mutation for creating a workspace
  const createMutation = useMutation<
    IrminAPIResponse<Workspace>,
    Error,
    CreateWorkspaceInput
  >({
    mutationFn: async (input) => {
      const core = await getCore();
      return core.workspaceService.createWorkspace({
        name: input.name,
        description: input.description,
      });
    },
    ...createMutationHandlers<Workspace, CreateWorkspaceInput>(
      queryClient,
      'workspaces',
      {
        cacheConfig: {
          primaryQueryKey: workspacesQueryKey,
          getItemId: (workspace) => workspace.id,
          createOptimisticItem: (
            input: CreateWorkspaceInput,
            tempId: string
          ) => ({
            id: tempId,
            name: input.name,
            description: input.description,
            slug: input.name.toLowerCase().replace(/\s+/g, '-'),
            users: [],
          }),
        },
        onSuccess: (res) => {
          void queryClient.invalidateQueries({
            queryKey: workspaceSummariesQueryKey,
          });
          irminAlert(
            'success',
            res.message ?? 'Workspace created successfully'
          );
        },
        onError: (error) => {
          irminAlert(
            'error',
            error.message ?? dict.common.errors.mutations.createWorkspaceFailed
          );
        },
      }
    ),
  });

  return {
    createMutation,
  };
}

/**
 * Hook for the lightweight workspace summaries query (used by workspace selection page).
 *
 * Separated from useWorkspaces to avoid triggering the full workspaces query
 * when only summaries are needed, and vice versa.
 */
export function useWorkspaceSummaries() {
  const { getCore } = useIrminCore();

  const workspaceSummariesQuery = useQuery<
    IrminAPIResponse<WorkspaceSummary[]>
  >({
    queryKey: workspaceSummariesQueryKey,
    queryFn: async () => {
      const core = await getCore();
      return core.workspaceService.fetchWorkspaceSummaries();
    },
  });

  return { workspaceSummariesQuery };
}
