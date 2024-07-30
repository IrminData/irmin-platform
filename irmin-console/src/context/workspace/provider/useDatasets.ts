'use client';

import { useState } from 'react';

import { Locale } from '@/dictionaries';

import { useFetchDatasets } from '@/context/workspace';

import { Dataset } from '@/types/api/Dataset';
import { Workspace } from '@/types/api/Workspace';

/**
 * Combined hook for datasets to be used in the Workspace Provider
 *
 * @param workspaceProps - The workspace properties
 * @param workspaceProps.currentWorkspace - The current workspace
 * @param workspaceProps.locale - The locale to use for the API calls
 */
const useDatasets = ({
  currentWorkspace,
  locale,
}: {
  currentWorkspace: Workspace | null;
  locale: Locale;
}) => {
  // Datasets
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const [datasetsFetchedFor, setDatasetsFetchedFor] = useState<string | null>(
    null
  );

  /**
   * Hook to fetch the datasets for the current workspace.
   * It will be run whenever the current workspace changes to update the datasets.
   */
  const fetchDatasets = useFetchDatasets(
    currentWorkspace,
    setDatasets,
    datasetsLoading,
    setDatasetsLoading,
    datasetsFetchedFor,
    setDatasetsFetchedFor,
    locale
  );

  return {
    datasets,
    datasetsLoading,
    fetchDatasets,
  };
};

export default useDatasets;
