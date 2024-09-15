'use client';

import { useCallback } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { Locale } from '@/dictionaries';
import IrminCore from '@/services/core/IrminCore';
import { fetchWorkspaceProxy } from '@/services/proxies/workspace';

import { setCookie } from '@/utils/cookie';

import { Workspace } from '@/types/api/Workspace';

/**
 * Hook to fetch the list of workspaces available to the user using the {@link IrminCore}.
 */
export const useFetchWorkspaces = (
  setWorkspaces: React.Dispatch<React.SetStateAction<Workspace[]>>,
  workspaceLoading: boolean,
  setWorkspaceLoading: React.Dispatch<React.SetStateAction<boolean>>,
  locale: Locale
) =>
  useCallback(async () => {
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
  }, [setWorkspaces, workspaceLoading, setWorkspaceLoading, locale]);

/**
 * Hook to fetch the full data for the current workspace using the {@link fetchWorkspaceProxy}.
 * Used to avoid fetching Core Irmin API on the client side.
 */
export const useFetchFullCurrentWorkspace = (locale: Locale, token: string) =>
  useCallback(
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
 * Hook to create a new workspace using the {@link IrminCore}.
 */
export const useCreateWorkspace = (locale: Locale) =>
  useCallback(
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
 * Hook to update the current workspace data using the {@link IrminCore}.
 */
export const useUpdateWorkspace = (locale: Locale) =>
  useCallback(
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
 * Hook to switch the currently active workspace using the {@link IrminCore}.
 * Refetches and sets the state of the current workspace.
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
    async (workspaceSlug: string | null) => {
      // Prevent multiple simultaneous switches
      if (workspaceLoading) return;
      setWorkspaceLoading(true);
      try {
        // Get the workspace service
        const { workspaceService } = new IrminCore(locale);
        // Fetch a list of all workspaces available to the user
        const workspaces = await fetchWorkspaces();
        // Update the workspaces cookie
        setCookie('workspaces', JSON.stringify(workspaces), 1);
        // If the workspace slug is not provided, reset the current workspace
        if (!workspaceSlug) {
          // Remove the current workspace from the cookies and state
          setCookie('currentWorkspaceSlug', '', -1);
          // Clear the current workspace
          setCurrentWorkspace(null);
          // Make sure the user is not on a workspace page eg. /portal/{workspace-slug}/*
          if (
            pathname.includes('/portal/') &&
            !pathname.includes('/portal/manage-workspaces') &&
            !pathname.includes('/portal/profile')
          ) {
            router.push('/portal/manage-workspaces');
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
        // Set desired workspace slug to cookies for future use
        setCookie('currentWorkspaceSlug', workspaceSlug, 1);
        // Switch to the new workspace
        const newWorkspace =
          await workspaceService.switchWorkspace(workspaceSlug);
        if (newWorkspace) {
          setCurrentWorkspace(newWorkspace.data);
          // If router not already on a workspace page, redirect to the workspace
          if (!pathname.includes(`/portal/${workspaceSlug}`)) {
            router.push(`/${locale}/portal/${workspaceSlug}/home`);
          }
        } else {
          throw new Error('Switching workspace failed');
        }
      } catch (e) {
        console.error('Switching workspace failed:', e);
        // Make sure the user is not on a workspace page eg. /portal/{workspace-slug}/*
        if (
          pathname.includes('/portal/') &&
          !pathname.includes('/portal/manage-workspaces') &&
          !pathname.includes('/portal/profile')
        ) {
          router.push('/portal/manage-workspaces');
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
 * Hook to transfer ownership of the current workspace to a new owner using the {@link IrminCore}.
 */
export const useTransferOwnership = (
  currentWorkspace: Workspace | null,
  setCurrentWorkspace: React.Dispatch<React.SetStateAction<Workspace | null>>,
  locale: Locale
) =>
  useCallback(
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
 * Hook to delete the current workspace using the {@link IrminCore}.
 */
export const useDeleteCurrentWorkspace = (
  switchWorkspace: (
    _workspaceSlug: string | null,
    _disableAlerts?: boolean
  ) => void,
  fetchWorkspaces: () => Promise<Workspace[] | undefined>,
  locale: Locale
) =>
  useCallback(async () => {
    const { workspaceService } = new IrminCore(locale);
    const response = await workspaceService.deleteWorkspace();
    await switchWorkspace(null, true);
    await fetchWorkspaces();

    return response;
  }, [switchWorkspace, fetchWorkspaces, locale]);
