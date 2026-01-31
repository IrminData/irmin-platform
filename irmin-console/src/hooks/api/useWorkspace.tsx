import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { workspaceQueryKey, workspacesQueryKey } from '@/lib/queryKeys';

import WorkspaceDeletionConfirmationModal from '@/components/workspace/WorkspaceDeletionConfirmationModal';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { Workspace } from '@/types/core/Workspace';

import {
  deleteMutationHandlers,
  updateMutationHandlers,
} from './mutations/utils';

type UpdateWorkspaceInput = Pick<Workspace, 'description' | 'name'>;

export function useWorkspace(slug: string) {
  const { getCore } = useIrminCore();
  const { locale, dict } = useLocale();
  const { irminAlert, irminModal, irminConfirm } = usePopup();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Query for fetching a single workspace (only if slug is provided)
  const workspaceQuery = useQuery<IrminAPIResponse<Workspace>, Error>({
    queryKey: workspaceQueryKey(slug!),
    queryFn: async () => {
      if (!slug) throw new Error('Workspace slug is required');
      const core = await getCore();
      const workspace = await core.workspaceService.fetchWorkspace({
        workspaceSlug: slug,
      });
      return workspace;
    },
    initialData: () => {
      const workspaces =
        queryClient.getQueryData<IrminAPIResponse<Workspace[]>>(
          workspacesQueryKey
        );
      return workspaces?.data?.find((w: Workspace) => w.slug === slug)
        ? {
            data: workspaces.data.find((w: Workspace) => w.slug === slug),
            success: true,
            message: 'Cached data',
          }
        : undefined;
    },
    enabled: !!slug,
  });

  // Mutation for updating a workspace (only if slug is provided)
  const updateMutation = useMutation<
    IrminAPIResponse<Workspace>,
    Error,
    UpdateWorkspaceInput
  >({
    mutationFn: async (input) => {
      if (!slug) throw new Error('Workspace slug is required');
      const core = await getCore();
      return core.workspaceService.updateWorkspace({
        workspace: slug,
        data: input,
      });
    },
    ...updateMutationHandlers<Workspace, UpdateWorkspaceInput>(queryClient, {
      cacheConfig: {
        primaryQueryKey: workspacesQueryKey,
        relatedQueryKeys: [workspaceQueryKey(slug!)],
        getItemId: (workspace) => workspace.slug,
      },
      singleItemQueryKey: workspaceQueryKey(slug!),
      onSuccess: (res) => {
        irminAlert('success', res.message ?? 'Workspace updated successfully');
      },
      onError: (error) => {
        irminAlert('error', error.message ?? 'Failed to update workspace');
      },
    }),
  });

  // Mutation for deleting a workspace (only if slug is provided)
  const deleteMutation = useMutation<IrminAPIResponse, Error, string>({
    mutationFn: async (workspaceSlug: string) => {
      const core = await getCore();
      return core.workspaceService.deleteWorkspace({
        workspace: workspaceSlug,
      });
    },
    ...deleteMutationHandlers<Workspace>(queryClient, {
      cacheConfig: {
        primaryQueryKey: workspacesQueryKey,
        getItemId: (workspace) => workspace.slug,
      },
      singleItemQueryKey: workspaceQueryKey(slug!),
      onSuccess: (res) => {
        irminAlert('success', res.message ?? 'Workspace deleted successfully');
        router.push(`/${locale}/workspace`);
      },
      onError: (error) => {
        irminAlert('error', error.message ?? 'Failed to delete workspace');
      },
    }),
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
          deleteWorkspace(slug!);
        }}
      />
    );
  }, [
    dict,
    irminModal,
    isDeletePending,
    isDeleteSuccess,
    deleteWorkspace,
    slug,
  ]);

  // Mutation for transferring a workspace
  const transferMutation = useMutation<IrminAPIResponse, Error, string>({
    mutationFn: async (newOwnerID) => {
      if (!slug) throw new Error('Workspace slug is required');
      const core = await getCore();
      return core.workspaceService.transferWorkspace({
        workspace: slug,
        newOwnerID,
      });
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(slug!),
      });
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
    async (newOwnerID: string) => {
      if (isTransferPending || isTransferSuccess) return;
      const confirmed = await irminConfirm(
        'warning',
        `${dict.common.areYouSureYouWantToTransferOwnership} (${workspaceQuery.data?.data?.name})`
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
      workspaceQuery.data?.data?.name,
    ]
  );

  // Mutation for leaving a workspace
  const leaveMutation = useMutation<IrminAPIResponse, Error, void>({
    mutationFn: async () => {
      if (!slug) throw new Error('Workspace slug is required');
      const core = await getCore();
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
  const confirmLeaveWorkspace = useCallback(async () => {
    if (isLeavePending || isLeaveSuccess) return;
    const confirmed = await irminConfirm(
      'warning',
      `${dict.workspaceSwitcher.leaveWorkspaceConfirm} (${workspaceQuery.data?.data?.name})`
    );
    if (confirmed) {
      leaveWorkspace();
    }
  }, [
    dict,
    irminConfirm,
    isLeavePending,
    isLeaveSuccess,
    leaveWorkspace,
    workspaceQuery.data?.data?.name,
  ]);

  return {
    // Queries
    workspaceQuery,

    // Mutations
    updateMutation,
    deleteMutation,
    transferMutation,
    leaveMutation,

    // Actions
    confirmDeleteWorkspace,
    confirmTransferWorkspace,
    confirmLeaveWorkspace,
  };
}
