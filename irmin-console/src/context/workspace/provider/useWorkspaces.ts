'use client';

import { useState } from 'react';

import { Locale } from '@/dictionaries';

import {
  useDeleteCurrentWorkspace,
  useFetchWorkspaces,
  useSwitchWorkspace,
  useTransferOwnership,
} from '@/context/workspace';

import { Workspace } from '@/types/api/Workspace';

/**
 * Combined hook for workspaces to be used in the Workspace Provider
 *
 * @param props - The workspace properties
 * @param props.locale - The locale to use for the API calls
 */
const useWorkspaces = ({ locale }: { locale: Locale }) => {
  // Workspaces
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(
    null
  );
  const [workspacesLoading, setWorkspacesLoading] = useState(false);

  /**
   * Hook to fetch the workspaces.
   * It will be run during the initialisation to load all available workspaces.
   */
  const fetchWorkspaces = useFetchWorkspaces(
    setWorkspaces,
    workspacesLoading,
    setWorkspacesLoading,
    locale
  );

  /**
   * Hook to switch to a workspace. Updates localStorage and the current workspace state.
   * Fetches the new workspace data, calls API /switch endpoint, redirects to the new workspace,
   * and shows a success or error popup message.
   * @param workspaceSlug - The slug of the workspace to switch to.
   */
  const switchToWorkspace = useSwitchWorkspace(
    currentWorkspace,
    setCurrentWorkspace,
    workspacesLoading,
    setWorkspacesLoading,
    fetchWorkspaces,
    locale
  );

  /**
   * Hook to delete the current workspace. It calls the API to delete the workspace,
   * switches to the default workspace, and fetches the updated workspaces.
   */
  const deleteCurrentWorkspace = useDeleteCurrentWorkspace(
    switchToWorkspace,
    fetchWorkspaces,
    locale
  );

  /**
   * Hook to transfer ownership of the current workspace. It calls the API to transfer ownership,
   * and refetches the current workspace.
   */
  const transferOwnership = useTransferOwnership(
    currentWorkspace,
    setCurrentWorkspace,
    locale
  );

  return {
    workspaces,
    currentWorkspace,
    workspacesLoading,
    fetchWorkspaces,
    switchToWorkspace,
    deleteCurrentWorkspace,
    transferOwnership,
  };
};

export default useWorkspaces;
