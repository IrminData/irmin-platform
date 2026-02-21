import { useMemo } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { inviteInboxQueryKey, invitesQueryKey } from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import type { Invite } from '@/types/core/Invite';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

import {
  createMutationHandlers,
  deleteMutationHandlers,
} from './mutations/utils';

type ChangeInviteRoleInput = {
  id: string;
  roleId: string;
};

type InviteWorkspaceUserInput = {
  email: string;
  roleId: string;
};

export function useInvites() {
  const { workspaceSlug } = useWorkspaceContext();
  const { getCore } = useIrminCore();
  const { irminAlert } = usePopup();
  const queryClient = useQueryClient();

  // Query for fetching the user's invite inbox
  const inviteInboxQuery = useQuery<IrminAPIResponse<Invite[]>>({
    queryKey: inviteInboxQueryKey,
    queryFn: async () => {
      const core = await getCore();
      const invites = await core.inviteService.listInviteInbox();
      return invites;
    },
  });

  // Query for fetching all invites in the current workspace
  const invitesQuery = useQuery<IrminAPIResponse<Invite[]>>({
    queryKey: invitesQueryKey(workspaceSlug),
    queryFn: async () => {
      const core = await getCore();
      const invites = await core.inviteService.listInvitesToWorkspace({
        workspace: workspaceSlug,
      });
      return invites;
    },
  });

  // Mutation for deleting an invite
  const deleteInviteMutation = useMutation<IrminAPIResponse, Error, string>({
    mutationFn: async (inviteID: string) => {
      const core = await getCore();
      const res = await core.inviteService.deleteInvite({ inviteID });
      return res;
    },
    ...deleteMutationHandlers<Invite>(queryClient, {
      cacheConfig: {
        primaryQueryKey: invitesQueryKey(workspaceSlug),
        getItemId: (invite) => invite.id,
      },
      onSuccess: (res) => {
        void queryClient.invalidateQueries({
          queryKey: inviteInboxQueryKey,
        });
        irminAlert('success', res.message ?? 'Invite deleted successfully');
      },
      onError: (error) => {
        irminAlert('error', error.message ?? 'Error deleting the invite');
      },
    }),
  });

  // Mutation for changing an invite's role
  const changeInviteRoleMutation = useMutation<
    IrminAPIResponse<Invite>,
    Error,
    ChangeInviteRoleInput
  >({
    mutationFn: async (input) => {
      const core = await getCore();
      const res = await core.inviteService.updateInvite({
        inviteID: input.id,
        role: input.roleId,
      });
      return res;
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({
        queryKey: invitesQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Invite role changed successfully');
    },
    onError: (error) => {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error changing the invite role'
      );
    },
  });

  // Mutation to resend an invite
  const resendInviteMutation = useMutation({
    mutationFn: async (inviteID: string) => {
      const core = await getCore();
      const res = await core.inviteService.resendInvite({ inviteID });
      return res;
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({
        queryKey: invitesQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Invite resent successfully');
    },
    onError: (error) => {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error resending the invite'
      );
    },
  });

  // Mutation to send an invite
  const sendInviteHandlers = useMemo(
    () =>
      createMutationHandlers<Invite, InviteWorkspaceUserInput>(
        queryClient,
        'invites',
        {
          cacheConfig: {
            primaryQueryKey: invitesQueryKey(workspaceSlug),
            getItemId: (invite) => invite.id,
            createOptimisticItem: (
              input: InviteWorkspaceUserInput,
              tempId: string
            ) => ({
              id: tempId,
              email: input.email,
              role: {
                id: input.roleId,
                role: 'Loading...',
                description: '',
                isOwner: false,
                isDefault: false,
              },
              expires_at: new Date(
                new Date().getTime() + 7 * 24 * 60 * 60 * 1000
              ).toISOString(),
              invited_by: {
                id: 'temp-user',
                first_name: 'Current',
                last_name: 'User',
                email: '',
                phone: '',
                company: '',
                profile_picture: '',
              },
              workspace: {
                id: 'temp-workspace',
                name: 'Current Workspace',
                slug: workspaceSlug,
                description: '',
              },
            }),
          },
          onSuccess: (res) => {
            irminAlert('success', res.message ?? 'Invite sent successfully');
          },
          onError: (error) => {
            irminAlert('error', error.message ?? 'Error sending the invite');
          },
        }
      ),
    [queryClient, workspaceSlug, irminAlert]
  );

  const sendInviteMutation = useMutation<
    IrminAPIResponse<Invite>,
    Error,
    InviteWorkspaceUserInput
  >({
    mutationFn: async (input) => {
      const core = await getCore();
      const res = await core.inviteService.sendInvite({
        workspace: workspaceSlug,
        email: input.email,
        role: input.roleId,
      });
      return res;
    },
    ...sendInviteHandlers,
  });

  return {
    // Queries
    inviteInboxQuery,
    invitesQuery,

    // Mutations
    deleteInviteMutation,
    changeInviteRoleMutation,
    resendInviteMutation,
    sendInviteMutation,
  };
}
