'use client';

import { useCallback } from 'react';

import { Locale } from '@/dictionaries';
import InviteService from '@/services/api/InviteService';

import { Invite } from '@/types/api/Invite';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { IrminRole, IrminRoleNames } from '@/types/api/IrminRole';
import { Workspace } from '@/types/api/Workspace';

/**
 * Hook to fetch the list of invites for the current workspace.
 *
 * @param currentWorkspace - The current workspace
 * @param setInvites - Function to update the invites state.
 * @param loading - Loading state to prevent multiple simultaneous fetches.
 * @param setLoading - Function to update the loading state.
 * @param fetchedFor - The slug of the workspace dashboards are fetched for.
 * @param setFetchedFor - Function to update fetched for state.
 * @param locale - The current locale.
 */
export const useFetchInvites = (
  currentWorkspace: Workspace | null,
  setInvites: React.Dispatch<React.SetStateAction<Invite[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Fetch and update context for invites of the current workspace.
     * @param forceFetch - Whether to force fetch.
     */
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!fetchedFor && !currentWorkspace) return;
        if (fetchedFor === currentWorkspace?.slug) return;
      }
      setFetchedFor(currentWorkspace?.slug ?? null);
      // Get the workspace service
      const inviteService = InviteService.getInstance(locale);
      // If the current workspace is not set, clear the connections
      if (!currentWorkspace) {
        setInvites([]);
        return;
      }
      try {
        // Prevent multiple simultaneous fetches
        if (loading) return;
        setLoading(true);
        // Fetch the data
        const response = await inviteService.getInvitesByWorkspace(
          currentWorkspace.slug
        );
        setInvites(response.data);
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
      locale,
    ]
  );

/**
 * Hook to send an invite to a user.
 *
 * @param currentWorkspace - The current workspace.
 * @param setInvites - Function to update the invites state.
 * @param locale - The current locale.
 */
export const useSendInvite = (
  currentWorkspace: Workspace | null,
  setInvites: React.Dispatch<React.SetStateAction<Invite[]>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Send an invite to a user and update the context state.
     *
     * @param name - The name of the user to invite.
     * @param email - The email of the user to invite.
     * @param role - The role to assign to the user.
     *
     * @returns Irmin API response.
     */
    async (
      name: string,
      email: string,
      role: IrminRoleNames
    ): Promise<IrminAPIResponse> => {
      // Make sure there is a current workspace
      if (!currentWorkspace) throw new Error('No current workspace');
      // Get the invite service
      const inviteService = InviteService.getInstance(locale);
      // Send the invite
      const response = await inviteService.inviteUserToWorkspace(
        name,
        email,
        role
      );
      // Get new invites
      const newInvites = await inviteService.getInvitesByWorkspace(
        currentWorkspace.slug
      );
      // Update the invites in the context state
      setInvites(newInvites.data);

      return response;
    },
    [currentWorkspace, setInvites, locale]
  );

/**
 * Hook to resend an invite to a user.
 *
 * @param locale - The current locale.
 */
export const useResendInvite = (locale: Locale) =>
  useCallback(
    /**
     * Resend an invite to a user and update the context state.
     *
     * @param invite - The ID of the invite to resend.
     *
     * @returns Irmin API response.
     */
    async (invite: number): Promise<IrminAPIResponse> => {
      // Get the invite service
      const inviteService = InviteService.getInstance(locale);
      // Resend the invite
      const response = await inviteService.resendUserInvite(invite);

      return response;
    },
    [locale]
  );

/**
 * Hook to cancel an invite to a user.
 *
 * @param invites - The list of workspace invites.
 * @param setInvites - Function to update the invites state.
 * @param locale - The current locale.
 */
export const useCancelInvite = (
  invites: Invite[],
  setInvites: React.Dispatch<React.SetStateAction<Invite[]>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Cancel an invite to a user and update the context state.
     *
     * @param invite - The ID of the invite to cancel.
     *
     * @returns Irmin API response.
     */
    async (invite: number): Promise<IrminAPIResponse> => {
      // Get the invite service
      const inviteService = InviteService.getInstance(locale);
      // Cancel the invite
      const response = await inviteService.cancelUserInvite(invite);
      // Update the invites in the context state
      setInvites(invites.filter((i) => i.id !== invite));

      return response;
    },
    [invites, setInvites, locale]
  );

/**
 * Hook to change an invite to a user.
 *
 * @param invites - The list of workspace invites.
 * @param setInvites - Function to update the invites state.
 * @param locale - The current locale.
 */
export const useChangeInvite = (
  invites: Invite[],
  setInvites: React.Dispatch<React.SetStateAction<Invite[]>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Change an invite to a user and update the context state.
     *
     * @param invite - The ID of the invite to change.
     * @param role - The role to assign to the user.
     *
     * @returns Irmin API response.
     */
    async (invite: number, role: IrminRole): Promise<IrminAPIResponse> => {
      // Get the invite service
      const inviteService = InviteService.getInstance(locale);
      // Change the invite
      const response = await inviteService.changeUserInviteRole(
        invite,
        role.name
      );
      // Update the invites in the context state
      setInvites(
        invites.map((i) => (i.id === invite ? { ...i, role: role } : i))
      );

      return response;
    },
    [invites, setInvites, locale]
  );
