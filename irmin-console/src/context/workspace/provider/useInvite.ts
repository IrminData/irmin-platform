'use client';

import { useState } from 'react';

import { Locale } from '@/dictionaries';

import {
  useCancelInvite,
  useChangeInvite,
  useFetchInvites,
  useResendInvite,
  useSendInvite,
} from '@/context/workspace/hooks/invite';

import { Invite } from '@/types/api/Invite';
import { Workspace } from '@/types/api/Workspace';

/**
 * Combined hook for connections to be used in the Workspace Provider
 *
 * @param workspaceProps - The workspace properties
 * @param workspaceProps.currentWorkspace - The current workspace
 * @param workspaceProps.locale - The locale to use for the API calls
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
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [invitesFetchedFor, setInvitesFetchedFor] = useState<string | null>(
    null
  );

  /**
   * Hook to fetch the invites for the current workspace.
   * It will be run whenever the current workspace changes to update the invites.
   */
  const fetchInvites = useFetchInvites(
    currentWorkspace,
    setInvites,
    invitesLoading,
    setInvitesLoading,
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
    invitesLoading,
    fetchInvites,
    sendInvite,
    resendInvite,
    cancelInvite,
    changeInvite,
  };
};

export default useInvite;
