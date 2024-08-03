'use client';

import { useState } from 'react';

import { Locale } from '@/dictionaries';

import { useFetchDataRepositories } from '@/context/workspace';

import { DataRepo } from '@/types/api/DataRepo';
import { Workspace } from '@/types/api/Workspace';

/**
 * Combined hook for dataRepositories to be used in the Workspace Provider
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
  // DataRepositories
  const [dataRepositories, setDataRepositories] = useState<DataRepo[]>([]);
  const [dataRepositoriesLoading, setDataRepositoriesLoading] = useState(false);
  const [dataRepositoriesFetchedFor, setDataRepositoriesFetchedFor] = useState<
    string | null
  >(null);

  /**
   * Hook to fetch the dataRepositories for the current workspace.
   * It will be run whenever the current workspace changes to update the dataRepositories.
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

  return {
    dataRepositories,
    dataRepositoriesLoading,
    fetchDataRepositories,
  };
};

export default useDataRepositories;
