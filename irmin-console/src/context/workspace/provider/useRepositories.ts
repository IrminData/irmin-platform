'use client';

import { useState } from 'react';

import { Locale } from '@/dictionaries';

import {
  useCreateRepository,
  useDeleteRepository,
  useFetchRepositories,
  useReassignRepository,
  useUpdateRepository,
} from '@/context/workspace/hooks/repositories';

import { Repository } from '@/types/api/Repository';
import { Workspace } from '@/types/api/Workspace';

/**
 * Combined hook for Repositories to be used in the Workspace Provider
 *
 * @param workspaceProps - The workspace properties
 * @param workspaceProps.currentWorkspace - The current workspace
 * @param workspaceProps.locale - The locale to use for the API calls
 */
const useRepositories = ({
  currentWorkspace,
  locale,
}: {
  currentWorkspace: Workspace | null;
  locale: Locale;
}) => {
  // Repositories
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [dataRepositoriesLoading, setRepositoriesLoading] = useState(false);
  const [dataRepositoriesFetchedFor, setRepositoriesFetchedFor] = useState<
    string | null
  >(null);

  /**
   * Hook to fetch the repositories for the current workspace.
   */
  const fetchRepositories = useFetchRepositories(
    currentWorkspace,
    setRepositories,
    dataRepositoriesLoading,
    setRepositoriesLoading,
    dataRepositoriesFetchedFor,
    setRepositoriesFetchedFor,
    locale
  );

  /**
   * Hook to create a new repository.
   */
  const createRepository = useCreateRepository(
    repositories,
    setRepositories,
    locale
  );

  /**
   * Hook to update a repository.
   */
  const updateRepository = useUpdateRepository(
    repositories,
    setRepositories,
    locale
  );

  /**
   * Hook to delete a repository.
   */
  const deleteRepository = useDeleteRepository(
    repositories,
    setRepositories,
    locale
  );

  /**
   * Hook to reassign repository to a new owner.
   */
  const reassignRepository = useReassignRepository(
    repositories,
    setRepositories,
    locale
  );

  return {
    repositories,
    dataRepositoriesLoading,
    setRepositories,
    fetchRepositories,
    createRepository,
    updateRepository,
    deleteRepository,
    reassignRepository,
  };
};

export default useRepositories;
