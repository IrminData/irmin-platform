'use client';

import { useCallback } from 'react';

import { Locale } from '@/dictionaries';
import IrminCore from '@/services/core/IrminCore';

import { ConnectionWorkflow } from '@/types/api/Workflow';
import { Workspace } from '@/types/api/Workspace';

/**
 * Hook to fetch the list of Connection Workflows for the current workspace.
 *
 * @param currentWorkspace - The current workspace
 * @param setConnections - Function to update the connections state.
 * @param loading - Loading state to prevent multiple simultaneous fetches.
 * @param setLoading - Function to update the loading state.
 * @param fetchedFor - The slug of the workspace workflows are fetched for.
 * @param setFetchedFor - Function to update fetched for state.
 * @param locale - The current locale.
 */
export const useFetchConnections = (
  currentWorkspace: Workspace | null,
  setConnections: React.Dispatch<React.SetStateAction<ConnectionWorkflow[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Fetch and update context for Connections Workflows of the current workspace using the {@link IrminCore}.
     *
     * @param forceFetch - If true, will refetch even if already fetched
     */
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!fetchedFor && !currentWorkspace) return;
        if (fetchedFor === currentWorkspace?.slug) return;
      }
      setFetchedFor(currentWorkspace?.slug ?? null);
      // Prevent multiple simultaneous fetches
      if (loading) return;
      setLoading(true);
      try {
        // Get the workflow service
        const { workflowService } = new IrminCore(locale);
        // If the current workspace is not set, clear the connections
        if (!currentWorkspace) {
          setConnections([]);
          return;
        }
        // Fetch the connections for the current workspace
        const response = await workflowService.fetchConnections();
        setConnections(response.data);
      } finally {
        setLoading(false);
      }
    },
    [
      currentWorkspace,
      setConnections,
      loading,
      setLoading,
      fetchedFor,
      setFetchedFor,
      locale,
    ]
  );
