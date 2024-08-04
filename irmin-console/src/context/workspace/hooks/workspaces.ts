'use client';

import { useCallback } from 'react';

import { useParams, usePathname, useRouter } from 'next/navigation';

import { Locale } from '@/dictionaries';
import WorkspaceService from '@/services/api/WorkspaceService';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
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
     * Fetch and update context for workspaces using the {@link WorkspaceService}.
     *
     * @returns Error if the fetch fails
     */
    async () => {
      // Get the workspace service
      const workspaceService = WorkspaceService.getInstance(locale);
      // Prevent multiple simultaneous fetches
      if (workspaceLoading) return;
      // Fetch the workspaces
      try {
        setWorkspaceLoading(true);
        const data = await workspaceService.fetchWorkspaces();
        setWorkspaces(data.data ?? []);
        setWorkspaceLoading(false);
      } catch (error) {
        setWorkspaceLoading(false);
        console.error('Error fetching workspaces:', error);
        throw error;
      }
    },
    [setWorkspaces, workspaceLoading, setWorkspaceLoading, locale]
  );

/**
 * Hook to create a new workspace.
 *
 * @param locale - The current locale.
 */
export const useCreateWorkspace = (locale: Locale) =>
  useCallback(
    /**
     * Create new workspace using the {@link WorkspaceService}.
     *
     * @param newWorkspaceName - The name of the new workspace.
     * @param newWorkspaceDescription - The description of the new workspace.
     *
     * @returns Irmin API response.
     * @returns Error if the creation fails
     */
    async (newWorkspaceName: string, newWorkspaceDescription: string) => {
      // Get the workspace service
      const workspaceService = WorkspaceService.getInstance(locale);
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
     * Update exisiting workspace using the {@link WorkspaceService}.
     *
     * @param workspace - The workspace data to update.
     *
     * @returns Irmin API response.
     * @returns Error if the update fails
     */
    async (workspace: Workspace) => {
      // Get the workspace service
      const workspaceService = WorkspaceService.getInstance(locale);
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
 * @param currentWorkspace - The current workspace to switch from.
 * @param setCurrentWorkspace - Function to update the current workspace state.
 * @param workspaceLoading - Loading state to prevent multiple simultaneous switches.
 * @param setWorkspaceLoading - Function to update the workspace loading state.
 * @param fetchWorkspaces - Function to fetch the list of workspaces.
 * @param locale - The current locale.
 */
export const useSwitchWorkspace = (
  currentWorkspace: Workspace | null,
  setCurrentWorkspace: React.Dispatch<React.SetStateAction<Workspace | null>>,
  workspaceLoading: boolean,
  setWorkspaceLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchWorkspaces: () => void,
  locale: Locale
) => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  return useCallback(
    /**
     * Switch user to a different workspace using the {@link WorkspaceService}.
     * Refetches and sets the state of the current workspace.
     *
     * @param workspaceSlug - The slug of the workspace to switch to.
     *
     * @returns Error if the switch fails.
     */
    async (workspaceSlug: string | null) => {
      try {
        // Get the workspace service
        const workspaceService = WorkspaceService.getInstance(locale);
        // Prevent multiple simultaneous switches
        if (workspaceLoading) return;
        setWorkspaceLoading(true);
        // Check if the workspace slug is the same as the current workspace from the url
        const pathHasWorkspace =
          Object.prototype.hasOwnProperty.call(params, 'workspace') &&
          typeof params.workspace === 'string' &&
          params.workspace.length > 0;
        if (
          (pathHasWorkspace && params.workspace === workspaceSlug) ||
          (!workspaceSlug && !pathHasWorkspace)
        ) {
          // Check if the workspace is already fetched and set as the current workspace
          if (currentWorkspace && currentWorkspace.slug === workspaceSlug) {
            // The workspace is already the current workspace, return
            return;
          }
        }
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
          // Refetch workspace list
          await fetchWorkspaces();
        } else {
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
        }
        setWorkspaceLoading(false);
      } catch (error) {
        setWorkspaceLoading(false);
        throw error;
      }
    },
    [
      currentWorkspace,
      setCurrentWorkspace,
      workspaceLoading,
      setWorkspaceLoading,
      fetchWorkspaces,
      locale,
      router,
      pathname,
      params,
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
     * Transfer ownership of the current workspace to a new owner using the {@link WorkspaceService}.
     * @param newOwner - The ID of the new owner.
     *
     * @returns Irmin API response.
     * @returns Error if the transfer fails.
     */
    async (newOwner: number): Promise<IrminAPIResponse> => {
      // Get the workspace service
      const workspaceService = WorkspaceService.getInstance(locale);
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
 * @param switchToWorkspace - Function to switch to a workspace.
 * @param fetchWorkspaces - Function to fetch the list of workspaces.
 * @param locale - The current locale.
 *
 * @remarks
 *
 * It deletes the workspace using the workspace service, updates the list of workspaces,
 * and resets the current workspace to null.
 */
export const useDeleteCurrentWorkspace = (
  switchToWorkspace: (
    _workspaceSlug: string | null,
    _disableAlerts?: boolean
  ) => void,
  fetchWorkspaces: () => void,
  locale: Locale
) =>
  useCallback(
    /**
     * Delete the current workspace and update the context state using the {@link WorkspaceService}.
     *
     * @returns Irmin API response.
     * @returns Error if the deletion fails.
     */
    async (): Promise<IrminAPIResponse> => {
      const workspaceService = WorkspaceService.getInstance(locale);
      const response = await workspaceService.deleteWorkspace();
      await switchToWorkspace(null, true);
      await fetchWorkspaces();

      return response;
    },
    [switchToWorkspace, fetchWorkspaces, locale]
  );
