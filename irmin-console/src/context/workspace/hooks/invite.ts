'use client';

import { useCallback } from 'react';

import IrminCore from '@/services/core/IrminCore';

import { Invite } from '@/types/core/Invite';
import { IrminRole, IrminRoleNames } from '@/types/core/IrminRole';
import { Workspace } from '@/types/core/Workspace';

/**
 * Hook to fetch and update context for Invites of the current workspace using the {@link IrminCore}.
 */
export const useFetchInvites = (
  currentWorkspace: Workspace | null,
  setInvites: React.Dispatch<React.SetStateAction<Invite[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  irminCore: IrminCore
) =>
  useCallback(
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!fetchedFor && !currentWorkspace) return;
        if (fetchedFor === currentWorkspace?.slug) return;
      }
      setFetchedFor(currentWorkspace?.slug ?? null);
      // Prevent multiple simultaneous fetches
      if (loading) return;
      setLoading(true);
      try {
        // If the current workspace is not set, clear the connections
        if (!currentWorkspace) {
          setInvites([]);
          return;
        }
        // Fetch the data
        const res = await irminCore.inviteService.fetchInvitesByWorkspace(
          currentWorkspace.slug
        );
        setInvites(res.data);
      } finally {
        setLoading(false);
      }
    },
    [
      currentWorkspace,
      setInvites,
      loading,
      setLoading,
      fetchedFor,
      setFetchedFor,
      irminCore,
    ]
  );

/**
 * Hook to send an invite to a user and update the context state using the {@link IrminCore}.
 */
export const useSendInvite = (
  currentWorkspace: Workspace | null,
  setInvites: React.Dispatch<React.SetStateAction<Invite[]>>,
  irminCore: IrminCore
) =>
  useCallback(
    async (name: string, email: string, role: IrminRoleNames) => {
      // Make sure there is a current workspace
      if (!currentWorkspace) throw new Error('No current workspace');
      // Send the invite
      const res = await irminCore.inviteService.inviteUserToWorkspace(
        name,
        email,
        role
      );
      // Refetch the invites
      const newInvites = await irminCore.inviteService.fetchInvitesByWorkspace(
        currentWorkspace.slug
      );
      // Update the invites in the context state
      setInvites(newInvites.data);

      return res;
    },
    [currentWorkspace, setInvites, irminCore]
  );

/**
 * Hook to resend an invite to a user and update the context state using the {@link IrminCore}.
 */
export const useResendInvite = (irminCore: IrminCore) =>
  useCallback(
    async (invite: string) => {
      // Resend the invite
      const res = await irminCore.inviteService.resendUserInvite(invite);
      return res;
    },
    [irminCore]
  );

/**
 * Hook to cancel an invite to a user and update the context state using the {@link IrminCore}.
 */
export const useCancelInvite = (
  invites: Invite[],
  setInvites: React.Dispatch<React.SetStateAction<Invite[]>>,
  irminCore: IrminCore
) =>
  useCallback(
    async (invite: string) => {
      // Cancel the invite
      const res = await irminCore.inviteService.cancelUserInvite(invite);
      // Update the invites in the context state
      setInvites(invites.filter((i) => i.id !== invite));

      return res;
    },
    [invites, setInvites, irminCore]
  );

/**
 * Hook to change an invite to a user and update the context state using the {@link IrminCore}.
 */
export const useChangeInvite = (
  invites: Invite[],
  setInvites: React.Dispatch<React.SetStateAction<Invite[]>>,
  irminCore: IrminCore
) =>
  useCallback(
    async (invite: string, role: IrminRole) => {
      // Change the invite
      const res = await irminCore.inviteService.changeUserInviteRole(
        invite,
        role.name
      );
      // Update the invites in the context state
      setInvites(
        invites.map((i) => (i.id === invite ? { ...i, role: role } : i))
      );

      return res;
    },
    [invites, setInvites, irminCore]
  );
