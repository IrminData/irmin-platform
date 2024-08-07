'use client';

import { useCallback } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { Locale } from '@/dictionaries';
import IrminCore from '@/services/core/IrminCore';
import { fetchWorkspaceProxy } from '@/services/proxies/workspace';

import { Workspace } from '@/types/api/Workspace';

/**
 * Hook to fetch the list of workspaces.
 *
 * @param setWorkspaces - Function to update the workspaces state.
 * @param workspaceLoading - Loading state to prevent multiple simultaneous fetches.
 * @param setWorkspaceLoading - Function to update the workspace loading state.
 * @param locale - The current locale.
 */
export const useFetchWorkspaces = (
  setWorkspaces: React.Dispatch<React.SetStateAction<Workspace[]>>,
  workspaceLoading: boolean,
  setWorkspaceLoading: React.Dispatch<React.SetStateAction<boolean>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Fetch and update context for workspaces using the {@link IrminCore}.
     *
     * @returns List of workspaces from the API, or throws an error.
     */
    async () => {
      // Get the workspace service
      const { workspaceService } = new IrminCore(locale);
      // Prevent multiple simultaneous fetches
      if (workspaceLoading) return;
      setWorkspaceLoading(true);
      try {
        // Fetch the workspaces
        const data = await workspaceService.fetchWorkspaces();
        setWorkspaces(data.data ?? []);
        setWorkspaceLoading(false);
        return data.data;
      } finally {
        setWorkspaceLoading(false);
      }
    },
    [setWorkspaces, workspaceLoading, setWorkspaceLoading, locale]
  );

/**
 * Hook to fetch the full data for the current workspace.
 *
 * @param locale - The current locale.
 * @param token - The API token to use for the request.
 */
export const useFetchFullCurrentWorkspace = (locale: Locale, token: string) =>
  useCallback(
    /**
     * Fetch the full data for the current workspace using
     * {@link fetchWorkspaceProxy} instead of fetching
     * Core Irmin API on the client side.
     *
     * @param workspace - The slug of the workspace to fetch data for.
     *
     * @returns Response object with data and metadata
     */
    async (workspace: string) => {
      // Fetch the full data for the current workspace
      const data = await fetchWorkspaceProxy({
        locale,
        token,
        workspace,
      });
      return data;
    },
    [locale, token]
  );

/**
 * Hook to create a new workspace.
 *
 * @param locale - The current locale.
 */
export const useCreateWorkspace = (locale: Locale) =>
  useCallback(
    /**
     * Create new workspace using the {@link IrminCore}.
     *
     * @param newWorkspaceName - The name of the new workspace.
     * @param newWorkspaceDescription - The description of the new workspace.
     */
    async (newWorkspaceName: string, newWorkspaceDescription: string) => {
      // Get the workspace service
      const { workspaceService } = new IrminCore(locale);
      // Create the workspace
      const response = await workspaceService.createWorkspace(
        newWorkspaceName,
        newWorkspaceDescription
      );
      return response;
    },
    [locale]
  );

/**
 * Hook to update the current workspace data.
 *
 * @param locale - The current locale.
 */
export const useUpdateWorkspace = (locale: Locale) =>
  useCallback(
    /**
     * Update exisiting workspace using the {@link IrminCore}.
     *
     * @param workspace - The workspace data to update.
     */
    async (workspace: Workspace) => {
      // Get the workspace service
      const { workspaceService } = new IrminCore(locale);
      // Update the workspace
      const response = await workspaceService.updateWorkspace(workspace);
      return response;
    },
    [locale]
  );

/**
 * Hook to switch to a workspace.
 *
 * @remarks
 *
 * It updates localStorage and the current workspace state, fetches the new workspace data,
 * calls API /switch endpoint, redirects to the new workspace, and shows a success or error popup message.
 *
 * @param setCurrentWorkspace - Function to update the current workspace state.
 * @param workspaceLoading - Loading state to prevent multiple simultaneous switches.
 * @param setWorkspaceLoading - Function to update the workspace loading state.
 * @param fetchWorkspaces - Function to fetch the list of workspaces.
 * @param locale - The current locale.
 */
export const useSwitchWorkspace = (
  setCurrentWorkspace: React.Dispatch<React.SetStateAction<Workspace | null>>,
  workspaceLoading: boolean,
  setWorkspaceLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchWorkspaces: () => Promise<Workspace[] | undefined>,
  locale: Locale
) => {
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(
    /**
     * Switch user to a different workspace using the {@link IrminCore}.
     * Refetches and sets the state of the current workspace.
     *
     * @param workspaceSlug - The slug of the workspace to switch to.
     */
    async (workspaceSlug: string | null) => {
      // Prevent multiple simultaneous switches
      if (workspaceLoading) return;
      setWorkspaceLoading(true);
      try {
        // Get the workspace service
        const { workspaceService } = new IrminCore(locale);
        // Fetch a list of all workspaces available to the user
        const workspaces = await fetchWorkspaces();
        // If the workspace slug is not provided, reset the current workspace
        if (!workspaceSlug) {
          // Remove the current workspace from the local storage and state
          localStorage.removeItem('currentWorkspaceSlug');
          // Clear the current workspace
          setCurrentWorkspace(null);
          // Make sure the user is not on a workspace page eg. /portal/{workspace-slug}/*
          if (
            pathname.includes('/portal/') &&
            !pathname.includes('/portal/profile')
          ) {
            router.push('/portal');
          }
          return;
        }
        // Make sure the workspace slug is valid and exists in the list of workspaces
        if (
          !workspaceSlug ||
          !workspaces ||
          !workspaces.some((workspace) => workspace.slug === workspaceSlug)
        ) {
          throw new Error('Invalid workspace slug');
        }
        // Set desired workspace slug to local storage for future use
        localStorage.setItem('currentWorkspaceSlug', workspaceSlug);
        // Switch to the new workspace
        const newWorkspace =
          await workspaceService.switchWorkspace(workspaceSlug);
        if (newWorkspace) {
          setCurrentWorkspace(newWorkspace.data);
          // If router not already on a workspace page, redirect to the dashboards page
          if (!pathname.includes(`/portal/${workspaceSlug}`)) {
            router.push(`/portal/${workspaceSlug}/dashboards`);
          }
        } else {
          throw new Error('Switching workspace failed');
        }
      } finally {
        setWorkspaceLoading(false);
      }
    },
    [
      setCurrentWorkspace,
      workspaceLoading,
      setWorkspaceLoading,
      fetchWorkspaces,
      locale,
      router,
      pathname,
    ]
  );
};

/**
 * Hook to transfer ownership of a workspace.
 *
 * @param currentWorkspace - The current workspace.
 * @param setCurrentWorkspace - Function to update the current workspace state.
 * @param locale - The current locale.
 *
 * @remarks
 *
 * It transfers the ownership of the workspace using the workspace service and updates the current workspace owner.
 * It also updates the currentWorkspace context state with the new owner.
 */
export const useTransferOwnership = (
  currentWorkspace: Workspace | null,
  setCurrentWorkspace: React.Dispatch<React.SetStateAction<Workspace | null>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Transfer ownership of the current workspace to a new owner using the {@link IrminCore}.
     * @param newOwner - The ID of the new owner.
     */
    async (newOwner: number) => {
      // Get the workspace service
      const { workspaceService } = new IrminCore(locale);
      // Transfer ownership
      const response =
        await workspaceService.transferWorkspaceOwnership(newOwner);
      // Update the current workspace owner
      if (currentWorkspace) {
        setCurrentWorkspace({ ...currentWorkspace, owner_id: newOwner });
      }

      return response;
    },
    [currentWorkspace, setCurrentWorkspace, locale]
  );

/**
 * Hook to delete a workspace.
 *
 * @param switchWorkspace - Function to switch to a workspace.
 * @param fetchWorkspaces - Function to fetch the list of workspaces.
 * @param locale - The current locale.
 *
 * @remarks
 *
 * It deletes the workspace using the workspace service, updates the list of workspaces,
 * and resets the current workspace to null.
 */
export const useDeleteCurrentWorkspace = (
  switchWorkspace: (
    _workspaceSlug: string | null,
    _disableAlerts?: boolean
  ) => void,
  fetchWorkspaces: () => Promise<Workspace[] | undefined>,
  locale: Locale
) =>
  useCallback(
    /**
     * Delete the current workspace and update the context state using the {@link IrminCore}.
     */
    async () => {
      const { workspaceService } = new IrminCore(locale);
      const response = await workspaceService.deleteWorkspace();
      await switchWorkspace(null, true);
      await fetchWorkspaces();

      return response;
    },
    [switchWorkspace, fetchWorkspaces, locale]
  );
