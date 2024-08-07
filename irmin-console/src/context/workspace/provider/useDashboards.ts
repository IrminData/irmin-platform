'use client';

import { useState } from 'react';

import { Locale } from '@/dictionaries';

import { useFetchDashboards } from '@/context/workspace/hooks/dashboards';

import { Dashboard } from '@/types/api/Dashboard';
import { Workspace } from '@/types/api/Workspace';

/**
 * Combined hook for dashboards to be used in the Workspace Provider
 *
 * @param workspaceProps - The workspace properties
 * @param workspaceProps.currentWorkspace - The current workspace
 * @param workspaceProps.locale - The locale to use for the API calls
 */
const useDashboards = ({
  currentWorkspace,
  locale,
}: {
  currentWorkspace: Workspace | null;
  locale: Locale;
}) => {
  // Dashboards
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [dashboardsLoading, setDashboardsLoading] = useState(false);
  const [dashboardsFetchedFor, setDashboardsFetchedFor] = useState<
    string | null
  >(null);

  /**
   * Hook to fetch the dashboards for the current workspace.
   */
  const fetchDashboards = useFetchDashboards(
    currentWorkspace,
    setDashboards,
    dashboardsLoading,
    setDashboardsLoading,
    dashboardsFetchedFor,
    setDashboardsFetchedFor,
    locale
  );

  return {
    dashboards,
    dashboardsLoading,
    setDashboards,
    fetchDashboards,
  };
};

export default useDashboards;
