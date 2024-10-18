'use client';

import { useCallback } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { Locale } from '@/dictionaries';
import IrminCore from '@/services/core/IrminCore';
import { fetchWorkspaceProxy } from '@/services/proxies/workspace';

import { setCookie } from '@/utils/cookie';

import { Workspace } from '@/types/core/Workspace';

/**
 * Hook to fetch the list of workspaces available to the user using the {@link IrminCore}.
 */
export const useFetchWorkspaces = (
  setWorkspaces: React.Dispatch<React.SetStateAction<Workspace[]>>,
  workspaceLoading: boolean,
  setWorkspaceLoading: React.Dispatch<React.SetStateAction<boolean>>,
  irminCore: IrminCore
) =>
  useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (workspaceLoading) return;
    setWorkspaceLoading(true);
    try {
      // Fetch the workspaces
      const res = await irminCore.workspaceService.fetchWorkspaces();
      setWorkspaces(res.data ?? []);
      setWorkspaceLoading(false);
      return res.data;
    } finally {
      setWorkspaceLoading(false);
    }
  }, [setWorkspaces, workspaceLoading, setWorkspaceLoading, irminCore]);

/**
 * Hook to fetch the full data for the current workspace using the {@link fetchWorkspaceProxy}.
 * Used to avoid fetching Core Irmin API on the client side.
 */
export const useFetchFullCurrentWorkspace = (locale: Locale) =>
  useCallback(
    async (workspace: string, token: string) => {
      // Fetch the full data for the current workspace
      const data = await fetchWorkspaceProxy({
        locale,
        token,
        workspace,
      });
      return data;
    },
    [locale]
  );

/**
 * Hook to create a new workspace using the {@link IrminCore}.
 */
export const useCreateWorkspace = (irminCore: IrminCore) =>
  useCallback(
    async (newWorkspaceName: string, newWorkspaceDescription: string) => {
      // Create the workspace
      const res = await irminCore.workspaceService.createWorkspace(
        newWorkspaceName,
        newWorkspaceDescription
      );
      return res;
    },
    [irminCore]
  );

/**
 * Hook to update the current workspace data using the {@link IrminCore}.
 */
export const useUpdateWorkspace = (irminCore: IrminCore) =>
  useCallback(
    async (workspace: Workspace) => {
      // Update the workspace
      const res = await irminCore.workspaceService.updateWorkspace(workspace);
      return res;
    },
    [irminCore]
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
  locale: Locale,
  irminCore: IrminCore
) => {
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(
    async (workspaceSlug: string | null) => {
      // Prevent multiple simultaneous switches
      if (workspaceLoading) return;
      setWorkspaceLoading(true);
      try {
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
          // Make sure the user is not on a workspace page eg. /console/{workspace-slug}/*
          if (
            pathname.includes('/console/') &&
            !pathname.includes('/console/manage-workspaces') &&
            !pathname.includes('/console/profile')
          ) {
            router.push('/console/manage-workspaces');
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
          await irminCore.workspaceService.switchWorkspace(workspaceSlug);
        if (newWorkspace) {
          setCurrentWorkspace(newWorkspace.data);
          // If router not already on a workspace page, redirect to the workspace
          if (!pathname.includes(`/console/${workspaceSlug}`)) {
            router.push(`/${locale}/console/${workspaceSlug}/home`);
          }
          return newWorkspace;
        } else {
          throw new Error('Switching workspace failed');
        }
      } catch (e) {
        console.error('Switching workspace failed:', e);
        // Make sure the user is not on a workspace page eg. /console/{workspace-slug}/*
        if (
          pathname.includes('/console/') &&
          !pathname.includes('/console/manage-workspaces') &&
          !pathname.includes('/console/profile')
        ) {
          router.push('/console/manage-workspaces');
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
      irminCore,
    ]
  );
};

/**
 * Hook to transfer ownership of the current workspace to a new owner using the {@link IrminCore}.
 */
export const useTransferOwnership = (
  currentWorkspace: Workspace | null,
  setCurrentWorkspace: React.Dispatch<React.SetStateAction<Workspace | null>>,
  irminCore: IrminCore
) =>
  useCallback(
    async (newOwner: string) => {
      // Transfer ownership
      const res =
        await irminCore.workspaceService.transferWorkspaceOwnership(newOwner);
      // Update the current workspace owner
      if (currentWorkspace) {
        setCurrentWorkspace({ ...currentWorkspace, owner_id: newOwner });
      }

      return res;
    },
    [currentWorkspace, setCurrentWorkspace, irminCore]
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
  irminCore: IrminCore
) =>
  useCallback(async () => {
    const res = await irminCore.workspaceService.deleteWorkspace();
    await switchWorkspace(null, true);
    await fetchWorkspaces();

    return res;
  }, [switchWorkspace, fetchWorkspaces, irminCore]);
