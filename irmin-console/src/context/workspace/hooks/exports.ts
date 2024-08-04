'use client';

import { useCallback } from 'react';

import { Locale } from '@/dictionaries';
import WorkflowService from '@/services/api/WorkflowService';

import { ExportWorkflow } from '@/types/api/Workflow';
import { Workspace } from '@/types/api/Workspace';

/**
 * Hook to fetch the list of export workflows for the current workspace.
 *
 * @param currentWorkspace - The current workspace
 * @param setExports - Function to update the exports state.
 * @param loading - Loading state to prevent multiple simultaneous fetches.
 * @param setLoading - Function to update the loading state.
 * @param fetchedFor - The slug of the workspace workflows are fetched for.
 * @param setFetchedFor - Function to update fetched for state.
 * @param locale - The current locale.
 */
export const useFetchExports = (
  currentWorkspace: Workspace | null,
  setExports: React.Dispatch<React.SetStateAction<ExportWorkflow[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Fetch and update context for Export Workflows of the current workspace using the {@link WorkflowService}.
     *
     * @param forceFetch - If true, will refetch even if already fetched
     *
     * @returns Void or Error if fails
     */
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!fetchedFor && !currentWorkspace) return;
        if (fetchedFor === currentWorkspace?.slug) return;
      }
      setFetchedFor(currentWorkspace?.slug ?? null);
      // Get the workflow service
      const workflowService = WorkflowService.getInstance(locale, '');
      // If the current workspace is not set, clear the connections
      if (!currentWorkspace) {
        setExports([]);
        return;
      }
      try {
        // Prevent multiple simultaneous fetches
        if (loading) return;
        setLoading(true);
        // Fetch the connections for the current workspace
        const response = await workflowService.fetchExports();
        setExports(response.data);
        setLoading(false);
      } catch (e) {
        setLoading(false);
        throw e;
      }
    },
    [
      currentWorkspace,
      setExports,
      loading,
      setLoading,
      fetchedFor,
      setFetchedFor,
      locale,
    ]
  );
