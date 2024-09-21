'use client';

import { useState } from 'react';

import { Locale } from '@/dictionaries';

import { useIAM } from '@/context/IAMContext';

import { Workspace } from '@/types/core/Workspace';

import {
  useCreateWorkspace,
  useDeleteCurrentWorkspace,
  useFetchFullCurrentWorkspace,
  useFetchWorkspaces,
  useSwitchWorkspace,
  useTransferOwnership,
  useUpdateWorkspace,
} from './hooks/workspaces';

/**
 * Hook for Workspaces to be used in the Workspace Provider.
 */
const useWorkspaces = ({ locale }: { locale: Locale }) => {
  // Get token from IAM context
  const { token } = useIAM();

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
   * Hook to fetch the full data for the current workspace.
   */
  const fetchFullCurrentWorkspace = useFetchFullCurrentWorkspace(
    locale,
    token ?? ''
  );

  /**
   * Hook to create a new workspace.
   * @param newWorkspaceName - The name of the new workspace.
   * @param newWorkspaceDescription - The description of the new workspace.
   */
  const createWorkspace = useCreateWorkspace(locale);

  /**
   * Hook to update the current workspace data.
   * @param workspace - The updated workspace data object.
   */
  const updateWorkspace = useUpdateWorkspace(locale);

  /**
   * Hook to switch to a workspace. Updates localStorage and the current workspace state.
   * Fetches the workspace data for switch target, calls API /switch endpoint, redirects to the switched workplace.
   * @param workspaceSlug - The slug of the workspace to switch to.
   */
  const switchWorkspace = useSwitchWorkspace(
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
    switchWorkspace,
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
    fetchFullCurrentWorkspace,
    switchWorkspace,
    deleteCurrentWorkspace,
    transferOwnership,
    createWorkspace,
    updateWorkspace,
  };
};

export default useWorkspaces;
