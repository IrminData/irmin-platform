'use client';

import { useState } from 'react';

import { Locale } from '@/dictionaries';

import {
  useCreateDataRepository,
  useDeleteDataRepository,
  useFetchDataRepositories,
  useReassignDataRepository,
  useUpdateDataRepository,
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
  const [repositories, setDataRepositories] = useState<Repository[]>([]);
  const [dataRepositoriesLoading, setDataRepositoriesLoading] = useState(false);
  const [dataRepositoriesFetchedFor, setDataRepositoriesFetchedFor] = useState<
    string | null
  >(null);

  /**
   * Hook to fetch the repositories for the current workspace.
   */
  const fetchDataRepositories = useFetchDataRepositories(
    currentWorkspace,
    setDataRepositories,
    dataRepositoriesLoading,
    setDataRepositoriesLoading,
    dataRepositoriesFetchedFor,
    setDataRepositoriesFetchedFor,
    locale
  );

  /**
   * Hook to create a new repository.
   */
  const createDataRepository = useCreateDataRepository(
    repositories,
    setDataRepositories,
    locale
  );

  /**
   * Hook to update a repository.
   */
  const updateDataRepository = useUpdateDataRepository(
    repositories,
    setDataRepositories,
    locale
  );

  /**
   * Hook to delete a repository.
   */
  const deleteDataRepository = useDeleteDataRepository(
    repositories,
    setDataRepositories,
    locale
  );

  /**
   * Hook to reassign repository to a new owner.
   */
  const reassignDataRepository = useReassignDataRepository(
    repositories,
    setDataRepositories,
    locale
  );

  return {
    repositories,
    dataRepositoriesLoading,
    setDataRepositories,
    fetchDataRepositories,
    createDataRepository,
    updateDataRepository,
    deleteDataRepository,
    reassignDataRepository,
  };
};

export default useRepositories;
