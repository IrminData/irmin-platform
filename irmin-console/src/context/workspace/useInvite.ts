'use client';

import { useState } from 'react';

import { Locale } from '@/dictionaries';

import { Invite } from '@/types/api/Invite';
import { Workspace } from '@/types/api/Workspace';

import {
  useCancelInvite,
  useChangeInvite,
  useFetchInvites,
  useResendInvite,
  useSendInvite,
} from './hooks/invite';

/**
 * Hook for Invites to be used in the Workspace Provider
 */
const useInvite = ({
  currentWorkspace,
  locale,
}: {
  currentWorkspace: Workspace | null;
  locale: Locale;
}) => {
  // Invites
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [invitesFetchedFor, setInvitesFetchedFor] = useState<string | null>(
    null
  );

  /**
   * Hook to fetch the invites for the current workspace.
   */
  const fetchInvites = useFetchInvites(
    currentWorkspace,
    setInvites,
    isLoading,
    setLoading,
    invitesFetchedFor,
    setInvitesFetchedFor,
    locale
  );

  /**
   * Hook to send an invite to a user. It calls the API to send the invite,
   * and fetches the updated invites.
   */
  const sendInvite = useSendInvite(currentWorkspace, setInvites, locale);

  /**
   * Hook to resend an invite to a user. It calls the API to resend the invite,
   * and fetches the updated invites.
   */
  const resendInvite = useResendInvite(locale);

  /**
   * Hook to cancel an invite to a user. It calls the API to cancel the invite,
   * and fetches the updated invites.
   */
  const cancelInvite = useCancelInvite(invites, setInvites, locale);

  /**
   * Hook to change an invite to a user. It calls the API to change the invite,
   * and fetches the updated invites.
   */
  const changeInvite = useChangeInvite(invites, setInvites, locale);

  return {
    invites,
    isLoading,
    setInvites,
    fetchInvites,
    sendInvite,
    resendInvite,
    cancelInvite,
    changeInvite,
  };
};

export default useInvite;
