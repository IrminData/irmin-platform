import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

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
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey });
      irminAlert('success', res.message ?? 'Workspace created successfully');
    },
    onError: (error) => {
      console.error('Failed to create workspace:', error);
      irminAlert('error', error.message ?? 'Failed to create workspace');
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
