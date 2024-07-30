'use client';

import { useCallback } from 'react';

import { Locale } from '@/dictionaries';
import DatasetService from '@/lib/api/DatasetService';

import { Dataset } from '@/types/api/Dataset';
import { Workspace } from '@/types/api/Workspace';

/**
 * Hook to fetch the list of Datasets for the current workspace.
 *
 * @param currentWorkspace - The current workspace
 * @param setDatasets - Function to update the datasets state.
 * @param loading - Loading state to prevent multiple simultaneous fetches.
 * @param setLoading - Function to update the loading state.
 * @param fetchedFor - The slug of the workspace workflows are fetched for.
 * @param setFetchedFor - Function to update fetched for state.
 * @param locale - The current locale.
 */
export const useFetchDatasets = (
  currentWorkspace: Workspace | null,
  setDatasets: React.Dispatch<React.SetStateAction<Dataset[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Fetch and update context for datasets of the current workspace.
     * @param forceFetch - Whether to force fetch.
     */
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!fetchedFor && !currentWorkspace) return;
        if (fetchedFor === currentWorkspace?.slug) return;
      }
      setFetchedFor(currentWorkspace?.slug ?? null);
      // Get the workspace service
      const datasetService = DatasetService.getInstance(locale);
      // If the current workspace is not set, clear the connections
      if (!currentWorkspace) {
        setDatasets([]);
        return;
      }
      try {
        // Prevent multiple simultaneous fetches
        if (loading) return;
        setLoading(true);
        // Fetch the connections for the current workspace
        const response = await datasetService.fetchAllDatasets();
        setDatasets(response.data);
      } finally {
        setLoading(false);
      }
    },
    [
      currentWorkspace,
      setDatasets,
      loading,
      setLoading,
      fetchedFor,
      setFetchedFor,
      locale,
    ]
  );
