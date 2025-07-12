import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { generateTempId } from '@/utils/generateTempId';

import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import { Workspace } from '@/types/core/Workspace';

export const workspacesQueryKey = ['workspaces'] as const;

type CreateWorkspaceInput = Pick<Workspace, 'name' | 'description'>;

export function useWorkspaces() {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Query for fetching all workspaces
  const workspacesQuery = useQuery<IrminAPIResponse<Workspace[]>>({
    queryKey: workspacesQueryKey,
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
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
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return core.workspaceService.createWorkspace({
        name: input.name,
        description: input.description,
      });
    },
    onMutate: async (newWorkspace: CreateWorkspaceInput) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: workspacesQueryKey });

      // Snapshot the previous value
      const previousWorkspaces =
        queryClient.getQueryData<IrminAPIResponse<Workspace[]>>(
          workspacesQueryKey
        );

      // Create unique temp ID for this specific mutation
      const tempId = generateTempId('workspaces');

      // Optimistically update the cache
      queryClient.setQueryData<IrminAPIResponse<Workspace[]>>(
        workspacesQueryKey,
        (old) => {
          if (!old?.data) return old;

          // Create optimistic workspace object
          const optimisticWorkspace: Workspace = {
            id: tempId, // Unique temporary ID
            name: newWorkspace.name,
            description: newWorkspace.description,
            slug: newWorkspace.name.toLowerCase().replace(/\s+/g, '-'),
            users: [],
          };

          return {
            ...old,
            data: [...old.data, optimisticWorkspace],
          };
        }
      );

      // Return context for rollback
      return { previousWorkspaces, tempId };
    },
    onError: (error, newWorkspace: CreateWorkspaceInput, context: unknown) => {
      // Rollback on error
      const ctx = context as
        | {
            previousWorkspaces?: IrminAPIResponse<Workspace[]>;
            tempId?: string;
          }
        | undefined;
      if (ctx?.previousWorkspaces) {
        queryClient.setQueryData(workspacesQueryKey, ctx.previousWorkspaces);
      }
      console.error('Failed to create workspace:', error);
      irminAlert('error', error.message ?? 'Failed to create workspace');
    },
    onSuccess: (
      res: IrminAPIResponse<Workspace>,
      newWorkspace: CreateWorkspaceInput,
      context: unknown
    ) => {
      // Update the cache with the real data from the server
      const ctx = context as
        | {
            previousWorkspaces?: IrminAPIResponse<Workspace[]>;
            tempId?: string;
          }
        | undefined;

      queryClient.setQueryData<IrminAPIResponse<Workspace[]>>(
        workspacesQueryKey,
        (old) => {
          if (!old?.data || !res.data || !ctx?.tempId) return old;

          // Replace the specific optimistic workspace with the real one using exact temp ID
          const updatedWorkspaces = old.data.map((workspace: Workspace) =>
            workspace.id === ctx.tempId ? res.data! : workspace
          );

          return {
            ...old,
            data: updatedWorkspaces,
          };
        }
      );

      irminAlert('success', res.message ?? 'Workspace created successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey });
    },
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
