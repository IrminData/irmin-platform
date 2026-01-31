import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { workspacesQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { Workspace } from '@/types/core/Workspace';

import { createMutationHandlers } from './mutations/utils';

type CreateWorkspaceInput = Pick<Workspace, 'description' | 'name'>;

export function useWorkspaces() {
  const { getCore } = useIrminCore();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Query for fetching all workspaces
  const workspacesQuery = useQuery<IrminAPIResponse<Workspace[]>>({
    queryKey: workspacesQueryKey,
    queryFn: async () => {
      const core = await getCore();
      const workspaces = await core.workspaceService.fetchWorkspaces();
      return workspaces;
    },
  });

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
          irminAlert(
            'success',
            res.message ?? 'Workspace created successfully'
          );
        },
        onError: (error) => {
          irminAlert('error', error.message ?? 'Failed to create workspace');
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
          (error as Error)?.message ?? 'Failed to switch workspace'
        );
      }
    },
    [locale, router, irminAlert]
  );

  return {
    // Queries
    workspacesQuery,

    // Mutations
    createMutation,

    // Actions
    switchWorkspace,
  };
}
