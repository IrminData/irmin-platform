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
export const workspaceQueryKey = (slug: string) => ['workspace', slug] as const;

type UpdateWorkspaceInput = Pick<Workspace, 'name' | 'description'>;
type CreateWorkspaceInput = Pick<Workspace, 'name' | 'description'>;

export function useWorkspace(slug?: string) {
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

  // Query for fetching a single workspace (only if slug is provided)
  const workspaceQuery = useQuery<IrminAPIResponse<Workspace>, Error>({
    queryKey: workspaceQueryKey(slug!),
    queryFn: async () => {
      if (!slug) throw new Error('Workspace slug is required');
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const workspace = await core.workspaceService.fetchWorkspace({
        workspaceSlug: slug,
      });
      return workspace;
    },
    enabled: !!slug,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey });
    },
    onError: (error) => {
      console.error('Failed to create workspace:', error);
      irminAlert('error', error.message ?? 'Failed to create workspace');
    },
  });

  // Mutation for updating a workspace (only if slug is provided)
  const updateMutation = useMutation<
    IrminAPIResponse<Workspace>,
    Error,
    UpdateWorkspaceInput
  >({
    mutationFn: async (input) => {
      if (!slug) throw new Error('Workspace slug is required');
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return core.workspaceService.updateWorkspace({
        workspace: slug,
        data: input,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKey(slug!) });
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey });
    },
    onError: (error) => {
      console.error('Failed to update workspace:', error);
      irminAlert('error', error.message ?? 'Failed to update workspace');
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
    workspaceQuery: slug ? workspaceQuery : undefined,

    // Mutations
    createMutation,
    updateMutation: slug ? updateMutation : undefined,

    // Actions
    switchWorkspace,
  };
}
