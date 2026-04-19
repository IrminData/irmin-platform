import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

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
 * Hook for workspace create mutation and navigation actions.
 *
 * Separated from useWorkspaces so consumers that only need to create or
 * switch workspaces don't trigger the full workspaces list query.
 */
export function useWorkspaceActions() {
  const { getCore } = useIrminCore();
  const { locale, dict } = useLocale();
  const { irminAlert } = usePopup();
  const queryClient = useQueryClient();
  const router = useRouter();

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

  // Function to switch workspaces
  const switchWorkspace = useCallback(
    async (newSlug: string) => {
      try {
        router.push(`/${locale}/workspace/${newSlug}`);
      } catch (error) {
        console.error('Failed to switch workspace: ', error);
        irminAlert(
          'error',
          (error as Error)?.message ??
            dict.common.errors.mutations.switchWorkspaceFailed
        );
      }
    },
    [locale, router, irminAlert, dict]
  );

  return {
    createMutation,
    switchWorkspace,
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
