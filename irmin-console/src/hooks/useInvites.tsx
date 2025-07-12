import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { generateTempId } from '@/utils/generateTempId';

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
    onMutate: async (inviteID: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: invitesQueryKey(workspaceSlug),
      });

      // Snapshot the previous value
      const previousInvites = queryClient.getQueryData<
        IrminAPIResponse<Invite[]>
      >(invitesQueryKey(workspaceSlug));

      // Optimistically remove from invites list cache
      queryClient.setQueryData<IrminAPIResponse<Invite[]>>(
        invitesQueryKey(workspaceSlug),
        (old: IrminAPIResponse<Invite[]> | undefined) => {
          if (!old?.data) return old;

          const filteredInvites = old.data.filter(
            (invite: Invite) => invite.id !== inviteID
          );

          return {
            ...old,
            data: filteredInvites,
          };
        }
      );

      // Return context for rollback
      return { previousInvites };
    },
    onError: (error, inviteID: string, context: unknown) => {
      // Rollback on error
      const ctx = context as
        | { previousInvites?: IrminAPIResponse<Invite[]> }
        | undefined;
      if (ctx?.previousInvites) {
        queryClient.setQueryData(
          invitesQueryKey(workspaceSlug),
          ctx.previousInvites
        );
      }
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error deleting the invite'
      );
    },
    onSuccess: (res: IrminAPIResponse) => {
      // The optimistic update is already done, just show success message
      irminAlert('success', res.message ?? 'Invite deleted successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: invitesQueryKey(workspaceSlug),
      });
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
    onMutate: async (input: InviteWorkspaceUserInput) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: invitesQueryKey(workspaceSlug),
      });

      // Snapshot the previous value
      const previousInvites = queryClient.getQueryData<
        IrminAPIResponse<Invite[]>
      >(invitesQueryKey(workspaceSlug));

      // Create unique temp ID for this specific mutation
      const tempId = generateTempId('invites');

      // Optimistically update the cache
      queryClient.setQueryData<IrminAPIResponse<Invite[]>>(
        invitesQueryKey(workspaceSlug),
        (old: IrminAPIResponse<Invite[]> | undefined) => {
          if (!old?.data) return old;

          // Create optimistic invite object
          const optimisticInvite: Invite = {
            id: tempId, // Unique temporary ID
            email: input.email,
            role: {
              id: input.roleId,
              role: 'Loading...',
              description: '',
              isOwner: false,
              isDefault: false,
            },
            expires_at: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000
            ).toISOString(), // 7 days from now
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
          };

          return {
            ...old,
            data: [...old.data, optimisticInvite],
          };
        }
      );

      // Return context for rollback
      return { previousInvites, tempId };
    },
    onError: (error, input: InviteWorkspaceUserInput, context: unknown) => {
      // Rollback on error
      const ctx = context as
        | { previousInvites?: IrminAPIResponse<Invite[]>; tempId?: string }
        | undefined;
      if (ctx?.previousInvites) {
        queryClient.setQueryData(
          invitesQueryKey(workspaceSlug),
          ctx.previousInvites
        );
      }
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error sending the invite'
      );
    },
    onSuccess: (
      res: IrminAPIResponse<Invite>,
      input: InviteWorkspaceUserInput,
      context: unknown
    ) => {
      // Update the cache with the real data from the server
      const ctx = context as
        | { previousInvites?: IrminAPIResponse<Invite[]>; tempId?: string }
        | undefined;

      queryClient.setQueryData<IrminAPIResponse<Invite[]>>(
        invitesQueryKey(workspaceSlug),
        (old: IrminAPIResponse<Invite[]> | undefined) => {
          if (!old?.data || !res.data || !ctx?.tempId) return old;

          // Replace the specific optimistic invite with the real one using exact temp ID
          const updatedInvites = old.data.map((invite: Invite) =>
            invite.id === ctx.tempId ? res.data! : invite
          );

          return {
            ...old,
            data: updatedInvites,
          };
        }
      );

      irminAlert('success', res.message ?? 'Invite sent successfully');
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: invitesQueryKey(workspaceSlug),
      });
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
