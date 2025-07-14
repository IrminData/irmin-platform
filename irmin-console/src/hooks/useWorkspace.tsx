import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { workspaceQueryKey, workspacesQueryKey } from '@/lib/queryKeys';

import WorkspaceDeletionConfirmationModal from '@/components/workspace/WorkspaceDeletionConfirmationModal';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';
import type { Workspace } from '@/types/core/Workspace';

type UpdateWorkspaceInput = Pick<Workspace, 'description' | 'name'>;

export function useWorkspace(slug: string) {
  const { getToken } = useIAM();
  const { locale, dict } = useLocale();
  const { irminAlert, irminModal, irminConfirm } = usePopup();
  const queryClient = useQueryClient();
  const router = useRouter();

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
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return core.workspaceService.updateWorkspace({
        workspace: slug,
        data: input,
      });
    },
    onMutate: async (input: UpdateWorkspaceInput) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: workspaceQueryKey(slug!) });
      await queryClient.cancelQueries({ queryKey: workspacesQueryKey });

      // Snapshot the previous values
      const previousWorkspace = queryClient.getQueryData<
        IrminAPIResponse<Workspace>
      >(workspaceQueryKey(slug!));
      const previousWorkspaces =
        queryClient.getQueryData<IrminAPIResponse<Workspace[]>>(
          workspacesQueryKey
        );

      // Optimistically update the single workspace cache
      queryClient.setQueryData<IrminAPIResponse<Workspace>>(
        workspaceQueryKey(slug!),
        (old: IrminAPIResponse<Workspace> | undefined) => {
          if (!old?.data) return old;

          return {
            ...old,
            data: {
              ...old.data,
              ...input,
            },
          };
        }
      );

      // Optimistically update the workspaces list cache
      queryClient.setQueryData<IrminAPIResponse<Workspace[]>>(
        workspacesQueryKey,
        (old: IrminAPIResponse<Workspace[]> | undefined) => {
          if (!old?.data) return old;

          const updatedWorkspaces = old.data.map((workspace: Workspace) =>
            workspace.slug === slug ? { ...workspace, ...input } : workspace
          );

          return {
            ...old,
            data: updatedWorkspaces,
          };
        }
      );

      // Return context for rollback
      return { previousWorkspace, previousWorkspaces };
    },
    onError: (error, input: UpdateWorkspaceInput, context: unknown) => {
      // Rollback on error
      const ctx = context as
        | {
            previousWorkspace?: IrminAPIResponse<Workspace>;
            previousWorkspaces?: IrminAPIResponse<Workspace[]>;
          }
        | undefined;
      if (ctx?.previousWorkspace) {
        queryClient.setQueryData(
          workspaceQueryKey(slug!),
          ctx.previousWorkspace
        );
      }
      if (ctx?.previousWorkspaces) {
        queryClient.setQueryData(workspacesQueryKey, ctx.previousWorkspaces);
      }
      console.error('Failed to update workspace:', error);
      irminAlert('error', error.message ?? 'Failed to update workspace');
    },
    onSuccess: (
      res: IrminAPIResponse<Workspace>,
      _input: UpdateWorkspaceInput
    ) => {
      // Update the cache with the real data from the server
      queryClient.setQueryData<IrminAPIResponse<Workspace>>(
        workspaceQueryKey(slug!),
        res
      );

      // Update the workspaces list if we have the real data
      if (res.data) {
        queryClient.setQueryData<IrminAPIResponse<Workspace[]>>(
          workspacesQueryKey,
          (old: IrminAPIResponse<Workspace[]> | undefined) => {
            if (!old?.data) return old;

            const updatedWorkspaces = old.data.map((workspace: Workspace) =>
              workspace.slug === slug ? res.data! : workspace
            );

            return {
              ...old,
              data: updatedWorkspaces,
            };
          }
        );
      }

      irminAlert('success', res.message ?? 'Workspace updated successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      void queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(slug!),
      });
      void queryClient.invalidateQueries({ queryKey: workspacesQueryKey });
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
      void queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(slug!),
      });
      void queryClient.invalidateQueries({ queryKey: workspacesQueryKey });
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
