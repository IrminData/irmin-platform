import { useRouter } from 'next/navigation';

import { useMutation, useQuery } from '@tanstack/react-query';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Invite } from '@/types/core/Invite';
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

export const inviteQueryKey = (inviteID: string) =>
  ['invite', inviteID] as const;

export function useInvite(inviteID: string) {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const router = useRouter();

  // Query for fetching a single invite by ID
  const inviteQuery = useQuery<IrminAPIResponse<Invite>>({
    queryKey: inviteQueryKey(inviteID!),
    queryFn: async () => {
      if (!inviteID) throw new Error('Invite ID is required');
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const invite = await core.inviteService.fetchInvite({ inviteID });
      return invite;
    },
    enabled: !!inviteID,
  });

  // Mutation to accept an invite
  const acceptInviteMutation = useMutation({
    mutationFn: async (inviteID: string) => {
      if (!inviteID) throw new Error('Invite ID is required');
      const token = await getToken();
      const core = new IrminCore(locale, token);
      const res = await core.inviteService.acceptInvite({ inviteID });
      return res;
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
      const res = await core.inviteService.declineInvite({ inviteID });
      return res;
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
