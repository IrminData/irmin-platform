'use client';

import { useState } from 'react';

import IrminCore from '@/services/core/IrminCore';

import { Invite } from '@/types/core/Invite';
import { Workspace } from '@/types/core/Workspace';

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
  irminCore,
}: {
  currentWorkspace: Workspace | null;
  irminCore: IrminCore;
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
    irminCore
  );

  /**
   * Hook to send an invite to a user. It calls the API to send the invite,
   * and fetches the updated invites.
   */
  const sendInvite = useSendInvite(currentWorkspace, setInvites, irminCore);

  /**
   * Hook to resend an invite to a user. It calls the API to resend the invite,
   * and fetches the updated invites.
   */
  const resendInvite = useResendInvite(irminCore);

  /**
   * Hook to cancel an invite to a user. It calls the API to cancel the invite,
   * and fetches the updated invites.
   */
  const cancelInvite = useCancelInvite(invites, setInvites, irminCore);

  /**
   * Hook to change an invite to a user. It calls the API to change the invite,
   * and fetches the updated invites.
   */
  const changeInvite = useChangeInvite(invites, setInvites, irminCore);

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
