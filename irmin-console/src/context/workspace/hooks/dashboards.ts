'use client';

import { useCallback } from 'react';

import { Locale } from '@/dictionaries';
import DashboardService from '@/services/api/DashboardService';

import { Dashboard } from '@/types/api/Dashboard';
import { Workspace } from '@/types/api/Workspace';

/**
 * Hook to fetch the list of dashboards for the current workspace.
 * @param currentWorkspace - The current workspace
 * @param setDashboards - Function to update the dashboards state.
 * @param loading - Loading state to prevent multiple simultaneous fetches.
 * @param setLoading - Function to update the loading state.
 * @param fetchedFor - The slug of the workspace dashboards are fetched for.
 * @param setFetchedFor - Function to update fetched for state.
 * @param locale - The current locale.
 */
export const useFetchDashboards = (
  currentWorkspace: Workspace | null,
  setDashboards: React.Dispatch<React.SetStateAction<Dashboard[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Fetch and update context for Dashboards of the current workspace using the {@link DashboardService}.
     *
     * @param forceFetch - If true, will refetch even if already fetched
     *
     * @returns Error if the fetch fails
     */
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!fetchedFor && !currentWorkspace) return;
        if (fetchedFor === currentWorkspace?.slug) return;
      }
      setFetchedFor(currentWorkspace?.slug ?? null);
      // Get the dashboard service
      const dashboardService = DashboardService.getInstance(locale);
      // If the current workspace is not set, clear the connections
      if (!currentWorkspace) {
        setDashboards([]);
        return;
      }
      try {
        // Prevent multiple simultaneous fetches
        if (loading) return;
        setLoading(true);
        // Fetch the connections for the current workspace
        const response = await dashboardService.fetchDashboards();
        setDashboards(response.data);
        setLoading(false);
      } catch (e) {
        setLoading(false);
        throw e;
      }
    },
    [
      currentWorkspace,
      setDashboards,
      loading,
      setLoading,
      fetchedFor,
      setFetchedFor,
      locale,
    ]
  );
