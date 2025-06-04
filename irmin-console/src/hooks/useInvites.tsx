import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { Invite } from '@/types/core/Invite';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

export const inviteInboxQueryKey = ['invite-inbox'] as const;
export const invitesQueryKey = (workspaceSlug: string) =>
  ['invites', workspaceSlug] as const;

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
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const queryClient = useQueryClient();

  // Query for fetching the user's invite inbox
  const inviteInboxQuery = useQuery<IrminAPIResponse<Invite[]>>({
    queryKey: inviteInboxQueryKey,
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const invites = await core.inviteService.listInviteInbox();
      return invites;
    },
  });

  // Query for fetching all invites in the current workspace
  const invitesQuery = useQuery<IrminAPIResponse<Invite[]>>({
    queryKey: invitesQueryKey(workspaceSlug),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const invites = await core.inviteService.listInvitesToWorkspace({
        workspace: workspaceSlug,
      });
      return invites;
    },
  });

  // Mutation for deleting an invite
  const deleteInviteMutation = useMutation({
    mutationFn: async (inviteID: string) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const res = await core.inviteService.deleteInvite({ inviteID });
      return res;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: invitesQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Invite deleted successfully');
    },
    onError: (error) => {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error deleting the invite'
      );
    },
  });

  // Mutation for changing an invite's role
  const changeInviteRoleMutation = useMutation<
    IrminAPIResponse<Invite>,
    Error,
    ChangeInviteRoleInput
  >({
    mutationFn: async (input) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const res = await core.inviteService.updateInvite({
        inviteID: input.id,
        role: input.roleId,
      });
      return res;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
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
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const res = await core.inviteService.resendInvite({ inviteID });
      return res;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
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
  const sendInviteMutation = useMutation<
    IrminAPIResponse<Invite>,
    Error,
    InviteWorkspaceUserInput
  >({
    mutationFn: async (input) => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const res = await core.inviteService.sendInvite({
        workspace: workspaceSlug,
        email: input.email,
        role: input.roleId,
      });
      return res;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: invitesQueryKey(workspaceSlug),
      });
      irminAlert('success', res.message ?? 'Invite sent successfully');
    },
    onError: (error) => {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error sending the invite'
      );
    },
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
