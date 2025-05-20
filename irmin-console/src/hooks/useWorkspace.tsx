import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import WorkspaceDeletionConfirmationModal from '@/components/workspace/WorkspaceDeletionConfirmationModal';

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
  const { locale, dict } = useLocale();
  const { irminAlert, irminModal, irminConfirm } = usePopup();
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
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey });
      irminAlert('success', res.message ?? 'Workspace created successfully');
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
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKey(slug!) });
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey });
      irminAlert('success', res.message ?? 'Workspace updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update workspace:', error);
      irminAlert('error', error.message ?? 'Failed to update workspace');
    },
  });

  // Mutation for deleting a workspace (only if slug is provided)
  const deleteMutation = useMutation<IrminAPIResponse, Error, void>({
    mutationFn: async () => {
      if (!slug) throw new Error('Workspace slug is required');
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return core.workspaceService.deleteWorkspace({ workspace: slug });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKey(slug!) });
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey });
      irminAlert('success', res.message ?? 'Workspace deleted successfully');
      router.push(`/${locale}/workspace`);
    },
    onError: (error) => {
      console.error('Failed to delete workspace:', error);
      irminAlert('error', error.message ?? 'Failed to delete workspace');
    },
  });

  // Function to confirm deletion of a workspace
  const {
    mutate: deleteWorkspace,
    isPending: isDeletePending,
    isSuccess: isDeleteSuccess,
  } = deleteMutation;
  const confirmDeleteWorkspace = useCallback(() => {
    if (isDeletePending || isDeleteSuccess) return;
    irminModal.show(
      dict.list.delete,
      <WorkspaceDeletionConfirmationModal
        dict={dict}
        close={irminModal.close}
        handleDelete={async () => {
          deleteWorkspace();
        }}
      />
    );
  }, [dict, irminModal, isDeletePending, isDeleteSuccess, deleteWorkspace]);

  // Mutation for transferring a workspace
  const transferMutation = useMutation<IrminAPIResponse, Error, string>({
    mutationFn: async (newOwnerID) => {
      if (!slug) throw new Error('Workspace slug is required');
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return core.workspaceService.transferWorkspace({
        workspace: slug,
        newOwnerID,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: workspaceQueryKey(slug!) });
      irminAlert(
        'success',
        res.message ?? 'Workspace transferred successfully'
      );
    },
    onError: (error) => {
      console.error('Failed to transfer workspace:', error);
      irminAlert('error', error.message ?? 'Failed to transfer workspace');
    },
  });

  // Function to confirm transfer of a workspace
  const {
    mutate: transferWorkspace,
    isPending: isTransferPending,
    isSuccess: isTransferSuccess,
  } = transferMutation;
  const confirmTransferWorkspace = useCallback(
    async (newOwnerID: string, workspaceName: string) => {
      if (isTransferPending || isTransferSuccess) return;
      const confirmed = await irminConfirm(
        'warning',
        `${dict.common.areYouSureYouWantToTransferOwnership} (${workspaceName})`
      );
      if (confirmed) {
        transferWorkspace(newOwnerID);
      }
    },
    [
      dict,
      irminConfirm,
      isTransferPending,
      isTransferSuccess,
      transferWorkspace,
    ]
  );

  // Mutation for leaving a workspace
  const leaveMutation = useMutation<IrminAPIResponse, Error, void>({
    mutationFn: async () => {
      if (!slug) throw new Error('Workspace slug is required');
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return core.workspaceService.leaveWorkspace({
        workspaceSlug: slug,
      });
    },
    onSuccess: (res) => {
      router.push(`/${locale}/workspace`);
      irminAlert('success', res.message ?? 'You have left the workspace');
    },
    onError: (error) => {
      console.error('Failed to leave workspace:', error);
      irminAlert('error', error.message ?? 'Failed to leave workspace');
    },
  });

  // Function to confirm leaving a workspace
  const {
    mutate: leaveWorkspace,
    isPending: isLeavePending,
    isSuccess: isLeaveSuccess,
  } = leaveMutation;
  const confirmLeaveWorkspace = useCallback(
    async (workspaceName: string) => {
      if (isLeavePending || isLeaveSuccess) return;
      const confirmed = await irminConfirm(
        'warning',
        `${dict.workspaceSwitcher.leaveWorkspaceConfirm} (${workspaceName})`
      );
      if (confirmed) {
        leaveWorkspace();
      }
    },
    [dict, irminConfirm, isLeavePending, isLeaveSuccess, leaveWorkspace]
  );

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
    deleteMutation: slug ? deleteMutation : undefined,
    transferMutation: slug ? transferMutation : undefined,
    leaveMutation: slug ? leaveMutation : undefined,

    // Actions
    switchWorkspace,
    confirmDeleteWorkspace,
    confirmTransferWorkspace,
    confirmLeaveWorkspace,
  };
}
