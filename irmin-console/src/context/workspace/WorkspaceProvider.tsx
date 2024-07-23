'use client';

import React, { useEffect, useRef, useState } from 'react';

import { useParams } from 'next/navigation';

import { useLocale } from '@/context/LocaleContext';
import {
  useDeleteCurrentWorkspace,
  useFetchActions,
  useFetchConnections,
  useFetchDashboards,
  useFetchDatasets,
  useFetchExports,
  useFetchRoles,
  useFetchWorkspaces,
  useSwitchWorkspace,
  WorkspaceContext,
} from '@/context/workspace';

import { Dashboard } from '@/types/api/Dashboard';
import { Dataset } from '@/types/api/Dataset';
import { IrminRole } from '@/types/api/IrminRole';
import {
  ActionWorkflow,
  ConnectionWorkflow,
  ExportWorkflow,
} from '@/types/api/Workflow';
import { Workspace } from '@/types/api/Workspace';

export const WorkspaceProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { locale } = useLocale();
  const params = useParams();

  // Users and Roles
  const [irminRoles, setIrminRoles] = useState<IrminRole[]>([]);

  // Workspaces
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(
    null
  );
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  // Connections
  const [connections, setConnections] = useState<ConnectionWorkflow[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsFetchedFor, setConnectionsFetchedFor] = useState<
    string | null
  >(null);

  // Exports
  const [exports, setExports] = useState<ExportWorkflow[]>([]);
  const [exportsLoading, setExportsLoading] = useState(false);
  const [exportsFetchedFor, setExportsFetchedFor] = useState<string | null>(
    null
  );

  // Actions
  const [actions, setActions] = useState<ActionWorkflow[]>([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [actionsFetchedFor, setActionsFetchedFor] = useState<string | null>(
    null
  );

  // Datasets
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const [datasetsFetchedFor, setDatasetsFetchedFor] = useState<string | null>(
    null
  );

  // Dashboards
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [dashboardsLoading, setDashboardsLoading] = useState(false);
  const [dashboardsFetchedFor, setDashboardsFetchedFor] = useState<
    string | null
  >(null);

  /**
   * Hook to fetch the list of workspaces.
   * It will be run during the initialisation to load all available workspaces.
   */
  const fetchWorkspaces = useFetchWorkspaces(
    setWorkspaces,
    workspaceLoading,
    setWorkspaceLoading,
    locale
  );

  /**
   * Hook to fetch the list of roles.
   * It will be run during the initialisation to load all available roles.
   */
  const fetchRoles = useFetchRoles(setIrminRoles, locale);

  /**
   * Hook to fetch the list of connections for the current workspace.
   * It will be run whenever the current workspace changes to update the connections.
   */
  const fetchConnections = useFetchConnections(
    currentWorkspace,
    setConnections,
    connectionsLoading,
    setConnectionsLoading,
    connectionsFetchedFor,
    setConnectionsFetchedFor,
    locale
  );

  /**
   * Hook to fetch the list of exports for the current workspace.
   * It will be run whenever the current workspace changes to update the exports.
   */
  const fetchExports = useFetchExports(
    currentWorkspace,
    setExports,
    exportsLoading,
    setExportsLoading,
    exportsFetchedFor,
    setExportsFetchedFor,
    locale
  );

  /**
   * Hook to fetch the list of actions for the current workspace.
   * It will be run whenever the current workspace changes to update the actions.
   */
  const fetchActions = useFetchActions(
    currentWorkspace,
    setActions,
    actionsLoading,
    setActionsLoading,
    actionsFetchedFor,
    setActionsFetchedFor,
    locale
  );

  /**
   * Hook to fetch the list of datasets for the current workspace.
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

  /**
   * Hook to fetch the list of dashboards for the current workspace.
   * It will be run whenever the current workspace changes to update the dashboards.
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

  /**
   * Hook to switch to a workspace. Updates localStorage and the current workspace state.
   * Fetches the new workspace data, calls API /switch endpoint, redirects to the new workspace,
   * and shows a success or error popup message.
   * @param workspaceSlug - The slug of the workspace to switch to.
   */
  const switchToWorkspace = useSwitchWorkspace(
    currentWorkspace,
    setCurrentWorkspace,
    workspaceLoading,
    setWorkspaceLoading,
    fetchWorkspaces,
    locale
  );

  /**
   * Hook to delete the current workspace. It calls the API to delete the workspace,
   * switches to the default workspace, and fetches the updated list of workspaces.
   */
  const deleteCurrentWorkspace = useDeleteCurrentWorkspace(
    switchToWorkspace,
    fetchWorkspaces,
    locale
  );

  /**
   * useEffect hook to initialise the context by fetching initial data.
   * This effect runs only once when the component is mounted.
   * It fetches workspaces and roles, and attempts to switch to the workspace stored in localStorage.
   */
  const initialisedRef = useRef(false);
  useEffect(() => {
    const initialise = async () => {
      if (initialisedRef.current) return;
      initialisedRef.current = true;

      try {
        setWorkspaceLoading(true);
        // Fetch workspaces and roles
        await fetchRoles();
        await fetchWorkspaces();
        // Check if path is provided with workspace
        const pathHasWorkspace =
          Object.prototype.hasOwnProperty.call(params, 'workspace') &&
          typeof params.workspace === 'string' &&
          params.workspace.length > 0;
        if (pathHasWorkspace) {
          // Attempt to switch to the workspace provided in the path
          await switchToWorkspace(params.workspace as string);
        } else {
          // Attempt to switch to the workspace stored in localStorage
          const currentWorkspaceSlug = localStorage.getItem(
            'currentWorkspaceSlug'
          );
          if (currentWorkspaceSlug && currentWorkspaceSlug.length > 0) {
            // Remove the workspace slug from localStorage
            localStorage.removeItem('currentWorkspaceSlug');
            // Switch to the cached workspace
            await switchToWorkspace(currentWorkspaceSlug);
          } else {
            // Set workspace to null
            await switchToWorkspace(null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        // Set workspace to null
        await switchToWorkspace(null);
      } finally {
        setWorkspaceLoading(false);
      }
    };

    initialise();
  }, [fetchWorkspaces, fetchRoles, switchToWorkspace, params]);

  /**
   * useEffect hook to fetch workflows and datasets whenever the current workspace changes.
   */
  useEffect(() => {
    fetchDashboards();
    fetchConnections();
    fetchActions();
    fetchExports();
    fetchDatasets();
  }, [
    fetchDashboards,
    fetchConnections,
    fetchActions,
    fetchExports,
    fetchDatasets,
    currentWorkspace,
  ]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        workspaceLoading,
        currentWorkspace,
        switchToWorkspace,
        deleteCurrentWorkspace: deleteCurrentWorkspace,
        fetchWorkspaces,
        irminRoles,
        dashboards: {
          dashboards,
          isLoading: dashboardsLoading,
          fetchDashboards,
        },
        connections: {
          connections,
          isLoading: connectionsLoading,
          fetchConnections,
        },
        exports: {
          exports,
          isLoading: exportsLoading,
          fetchExports,
        },
        actions: {
          actions,
          isLoading: actionsLoading,
          fetchActions,
        },
        datasets: {
          datasets,
          isLoading: datasetsLoading,
          fetchDatasets,
        },
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};
