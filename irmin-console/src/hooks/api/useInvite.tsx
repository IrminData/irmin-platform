import { useRouter } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  inviteInboxQueryKey,
  inviteQueryKey,
  workspaceSummariesQueryKey,
  workspacesQueryKey,
} from '@/lib/queryKeys';

import { useIrminCore } from '@/context/IrminCoreContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import type { Invite } from '@/types/core/Invite';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

type UseInviteOptions = {
  /** Skip navigation after decline (useful when already on the workspace list page) */
  skipDeclineNavigation?: boolean;
  /** Skip fetching the invite query (useful when only mutations are needed) */
  skipQuery?: boolean;
};

export function useInvite(inviteID: string, options?: UseInviteOptions) {
  const { getCore } = useIrminCore();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Query for fetching a single invite by ID
  const inviteQuery = useQuery<IrminAPIResponse<Invite>, Error>({
    queryKey: inviteQueryKey(inviteID),
    queryFn: async () => {
      const core = await getCore();
      return await core.inviteService.fetchInvite({
        inviteID,
      });
    },
    initialData: () => {
      const invites =
        queryClient.getQueryData<IrminAPIResponse<Invite[]>>(
          inviteInboxQueryKey
        );
      return invites?.data?.find((i: Invite) => i.id === inviteID)
        ? {
            data: invites.data.find((i: Invite) => i.id === inviteID),
            success: true,
            message: 'Cached data',
          }
        : undefined;
    },
    enabled: !!inviteID && !options?.skipQuery,
  });

  // Mutation to accept an invite
  const acceptInviteMutation = useMutation({
    mutationFn: async (inviteID: string) => {
      if (!inviteID) throw new Error('Invite ID is required');
      const core = await getCore();
      return await core.inviteService.acceptInvite({ inviteID });
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({
        queryKey: inviteInboxQueryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: workspaceSummariesQueryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: workspacesQueryKey,
      });
      irminAlert('success', res.message ?? 'Invite accepted successfully');
      const slug = res.data?.workspace?.slug;
      router.push(slug ? `/${locale}/workspace/${slug}` : `/${locale}/workspace`);
    },
    onError: (error) => {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error accepting the invite'
      );
    },
  });

  // Mutation to decline an invite
  const declineInviteMutation = useMutation({
    mutationFn: async (inviteID: string) => {
      if (!inviteID) throw new Error('Invite ID is required');
      const core = await getCore();
      return await core.inviteService.declineInvite({ inviteID });
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({
        queryKey: inviteInboxQueryKey,
      });
      irminAlert('success', res.message ?? 'Invite declined successfully');
      if (!options?.skipDeclineNavigation) {
        router.push(`/${locale}/workspace`);
      }
    },
    onError: (error) => {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error declining the invite'
      );
    },
  });

  return {
    // Queries
    inviteQuery,

    // Mutations
    acceptInviteMutation,
    declineInviteMutation,
  };
}
