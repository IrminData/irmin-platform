import { useRouter } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import IrminCore from '@/lib/core';
import { inviteInboxQueryKey, inviteQueryKey } from '@/lib/queryKeys';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import type { Invite } from '@/types/core/Invite';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

export function useInvite(inviteID: string) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Query for fetching a single invite by ID
  const inviteQuery = useQuery<IrminAPIResponse<Invite>, Error>({
    queryKey: inviteQueryKey(inviteID),
    queryFn: async () => {
      const token = await getToken();
      const core = new IrminCore(locale, token);
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
    enabled: !!inviteID,
  });

  // Mutation to accept an invite
  const acceptInviteMutation = useMutation({
    mutationFn: async (inviteID: string) => {
      if (!inviteID) throw new Error('Invite ID is required');
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.inviteService.acceptInvite({ inviteID });
    },
    onSuccess: (res) => {
      irminAlert('success', res.message ?? 'Invite accepted successfully');
      router.push(`/${locale}/workspace/${res.data?.workspace?.slug}`);
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
      const token = await getToken();
      const core = new IrminCore(locale, token);
      return await core.inviteService.declineInvite({ inviteID });
    },
    onSuccess: (res) => {
      irminAlert('success', res.message ?? 'Invite declined successfully');
      router.push(`/${locale}/workspace`);
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
