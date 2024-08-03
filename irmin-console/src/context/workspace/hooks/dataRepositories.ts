'use client';

import { useCallback } from 'react';

import { Locale } from '@/dictionaries';
import DataRepoService from '@/services/api/DataRepoService';

import { DataRepo } from '@/types/api/DataRepo';
import { Workspace } from '@/types/api/Workspace';

/**
 * Hook to fetch the list of DataRepositories for the current workspace.
 *
 * @param currentWorkspace - The current workspace
 * @param setDataRepositories - Function to update the dataRepositories state.
 * @param loading - Loading state to prevent multiple simultaneous fetches.
 * @param setLoading - Function to update the loading state.
 * @param fetchedFor - The slug of the workspace workflows are fetched for.
 * @param setFetchedFor - Function to update fetched for state.
 * @param locale - The current locale.
 */
export const useFetchDataRepositories = (
  currentWorkspace: Workspace | null,
  setDataRepositories: React.Dispatch<React.SetStateAction<DataRepo[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Fetch and update context for dataRepositories of the current workspace.
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
      const datasetService = DataRepoService.getInstance(locale);
      // If the current workspace is not set, clear the connections
      if (!currentWorkspace) {
        setDataRepositories([]);
        return;
      }
      try {
        // Prevent multiple simultaneous fetches
        if (loading) return;
        setLoading(true);
        // Fetch the connections for the current workspace
        const response = await datasetService.fetchAllDataRepositories();
        setDataRepositories(response.data);
      } finally {
        setLoading(false);
      }
    },
    [
      currentWorkspace,
      setDataRepositories,
      loading,
      setLoading,
      fetchedFor,
      setFetchedFor,
      locale,
    ]
  );
