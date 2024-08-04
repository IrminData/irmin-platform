'use client';

import { useState } from 'react';

import { Locale } from '@/dictionaries';

import {
  useCreateDataRepository,
  useDeleteDataRepository,
  useFetchDataRepositories,
  useReassignDataRepository,
  useUpdateDataRepository,
} from '@/context/workspace/hooks/dataRepositories';

import { DataRepo } from '@/types/api/DataRepo';
import { Workspace } from '@/types/api/Workspace';

/**
 * Combined hook for Data Repositories to be used in the Workspace Provider
 *
 * @param workspaceProps - The workspace properties
 * @param workspaceProps.currentWorkspace - The current workspace
 * @param workspaceProps.locale - The locale to use for the API calls
 */
const useDataRepositories = ({
  currentWorkspace,
  locale,
}: {
  currentWorkspace: Workspace | null;
  locale: Locale;
}) => {
  // Data Repositories
  const [dataRepositories, setDataRepositories] = useState<DataRepo[]>([]);
  const [dataRepositoriesLoading, setDataRepositoriesLoading] = useState(false);
  const [dataRepositoriesFetchedFor, setDataRepositoriesFetchedFor] = useState<
    string | null
  >(null);

  /**
   * Hook to fetch the dataRepositories for the current workspace.
   * It will be run whenever the current workspace changes to update the Data Repositories.
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
   * Hook to create a new data repository.
   */
  const createDataRepository = useCreateDataRepository(
    dataRepositories,
    setDataRepositories,
    locale
  );

  /**
   * Hook to update a data repository.
   */
  const updateDataRepository = useUpdateDataRepository(
    dataRepositories,
    setDataRepositories,
    locale
  );

  /**
   * Hook to delete a data repository.
   */
  const deleteDataRepository = useDeleteDataRepository(
    dataRepositories,
    setDataRepositories,
    locale
  );

  /**
   * Hook to reassign data repository to a new owner.
   */
  const reassignDataRepository = useReassignDataRepository(
    dataRepositories,
    setDataRepositories,
    locale
  );

  return {
    dataRepositories,
    dataRepositoriesLoading,
    fetchDataRepositories,
    createDataRepository,
    updateDataRepository,
    deleteDataRepository,
    reassignDataRepository,
  };
};

export default useDataRepositories;
