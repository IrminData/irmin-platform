'use client';

import { useCallback } from 'react';

import { useParams, usePathname, useRouter } from 'next/navigation';

import DashboardService from '@/lib/api/DashboardService';
import DatasetService from '@/lib/api/DatasetService';
import UserAndRoleService from '@/lib/api/UserAndRoleService';
import WorkflowService from '@/lib/api/WorkflowService';
import WorkspaceService from '@/lib/api/WorkspaceService';

import { Dashboard } from '@/types/api/Dashboard';
import { Dataset } from '@/types/api/Dataset';
import { IrminRole } from '@/types/api/IrminRole';
import {
  ActionWorkflow,
  ConnectionWorkflow,
  ExportWorkflow,
} from '@/types/api/Workflow';
import { Workspace } from '@/types/api/Workspace';

/**
 * Hook to fetch the list of workspaces.
 * @param setWorkspaces - Function to update the workspaces state.
 * @param workspaceLoading - Loading state to prevent multiple simultaneous fetches.
 * @param setWorkspaceLoading - Function to update the workspace loading state.
 * @param locale - The current locale.
 */
export const useFetchWorkspaces = (
  setWorkspaces: React.Dispatch<React.SetStateAction<Workspace[]>>,
  workspaceLoading: boolean,
  setWorkspaceLoading: React.Dispatch<React.SetStateAction<boolean>>,
  locale: string
) =>
  useCallback(async () => {
    // Get the workspace service
    const workspaceService = WorkspaceService.getInstance(locale);
    // Prevent multiple simultaneous fetches
    if (workspaceLoading) return;
    // Fetch the workspaces
    try {
      setWorkspaceLoading(true);
      const data = await workspaceService.fetchWorkspaces();
      setWorkspaces(data.data ?? []);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      throw error;
    } finally {
      setWorkspaceLoading(false);
    }
  }, [setWorkspaces, workspaceLoading, setWorkspaceLoading, locale]);

/**
 * Hook to fetch the list of roles.
 * @param setIrminRoles - Function to update the roles state.
 * @param locale - The current locale.
 */
export const useFetchRoles = (
  setIrminRoles: React.Dispatch<React.SetStateAction<IrminRole[]>>,
  locale: string
) =>
  useCallback(async () => {
    // Get the workspace service
    const rolesService = UserAndRoleService.getInstance(locale);
    // Fetch the roles
    try {
      const savedRoles = await rolesService.getRoles();
      if (savedRoles && savedRoles.length > 0) {
        setIrminRoles(savedRoles);
      } else {
        const data = await rolesService.fetchRoles();
        setIrminRoles(data.data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      setIrminRoles([]);
      throw error;
    }
  }, [setIrminRoles, locale]);

/**
 * Hook to fetch the list of connection workflows for the current workspace.
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
  locale: string
) =>
  useCallback(
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!fetchedFor && !currentWorkspace) return;
        if (fetchedFor === currentWorkspace?.slug) return;
      }
      setFetchedFor(currentWorkspace?.slug ?? null);
      // Get the workspace service
      const workflowService = WorkflowService.getInstance(locale);
      // If the current workspace is not set, clear the connections
      if (!currentWorkspace) {
        setConnections([]);
        return;
      }
      try {
        // Prevent multiple simultaneous fetches
        if (loading) return;
        setLoading(true);
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

/**
 * Hook to fetch the list of export workflows for the current workspace.
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
  locale: string
) =>
  useCallback(
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!fetchedFor && !currentWorkspace) return;
        if (fetchedFor === currentWorkspace?.slug) return;
      }
      setFetchedFor(currentWorkspace?.slug ?? null);
      // Get the workspace service
      const workflowService = WorkflowService.getInstance(locale);
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
      } finally {
        setLoading(false);
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

/**
 * Hook to fetch the list of actions workflows for the current workspace.
 * @param currentWorkspace - The current workspace
 * @param setActions - Function to update the actions state.
 * @param loading - Loading state to prevent multiple simultaneous fetches.
 * @param setLoading - Function to update the loading state.
 * @param fetchedFor - The slug of the workspace workflows are fetched for.
 * @param setFetchedFor - Function to update fetched for state.
 * @param locale - The current locale.
 */
export const useFetchActions = (
  currentWorkspace: Workspace | null,
  setActions: React.Dispatch<React.SetStateAction<ActionWorkflow[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  locale: string
) =>
  useCallback(
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!fetchedFor && !currentWorkspace) return;
        if (fetchedFor === currentWorkspace?.slug) return;
      }
      setFetchedFor(currentWorkspace?.slug ?? null);
      // Get the workspace service
      const workflowService = WorkflowService.getInstance(locale);
      // If the current workspace is not set, clear the connections
      if (!currentWorkspace) {
        setActions([]);
        return;
      }
      try {
        // Prevent multiple simultaneous fetches
        if (loading) return;
        setLoading(true);
        // Fetch the connections for the current workspace
        const response = await workflowService.fetchActions();
        setActions(response.data);
      } finally {
        setLoading(false);
      }
    },
    [
      currentWorkspace,
      setActions,
      loading,
      setLoading,
      fetchedFor,
      setFetchedFor,
      locale,
    ]
  );

/**
 * Hook to fetch the list of Datasets for the current workspace.
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
  locale: string
) =>
  useCallback(
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
  locale: string
) =>
  useCallback(
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!fetchedFor && !currentWorkspace) return;
        if (fetchedFor === currentWorkspace?.slug) return;
      }
      setFetchedFor(currentWorkspace?.slug ?? null);
      // Get the workspace service
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
      } finally {
        setLoading(false);
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

/**
 * Hook to switch to a workspace.
 * It updates localStorage and the current workspace state, fetches the new workspace data,
 * calls API /switch endpoint, redirects to the new workspace, and shows a success or error popup message.
 * @param currentWorkspace - The current workspace to switch from.
 * @param setCurrentWorkspace - Function to update the current workspace state.
 * @param workspaceLoading - Loading state to prevent multiple simultaneous switches.
 * @param setWorkspaceLoading - Function to update the workspace loading state.
 * @param fetchWorkspaces - Function to fetch the list of workspaces.
 * @param locale - The current locale.
 */
export const useSwitchWorkspace = (
  currentWorkspace: Workspace | null,
  setCurrentWorkspace: React.Dispatch<React.SetStateAction<Workspace | null>>,
  workspaceLoading: boolean,
  setWorkspaceLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchWorkspaces: () => void,
  locale: string
) => {
  const workspaceService = WorkspaceService.getInstance(locale);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  return useCallback(
    async (workspaceSlug: string | null) => {
      try {
        // Prevent multiple simultaneous switches
        if (workspaceLoading) return;
        setWorkspaceLoading(true);
        // Check if the workspace slug is the same as the current workspace from the url
        const pathHasWorkspace =
          Object.prototype.hasOwnProperty.call(params, 'workspace') &&
          typeof params.workspace === 'string' &&
          params.workspace.length > 0;
        if (
          (pathHasWorkspace && params.workspace === workspaceSlug) ||
          (!workspaceSlug && !pathHasWorkspace)
        ) {
          // Check if the workspace is already fetched and set as the current workspace
          if (currentWorkspace && currentWorkspace.slug === workspaceSlug) {
            // The workspace is already the current workspace, return
            return;
          }
        }
        // If the workspace slug is not provided, reset the current workspace
        if (!workspaceSlug) {
          // Remove the current workspace from the local storage and state
          localStorage.removeItem('currentWorkspaceSlug');
          // Clear the current workspace
          setCurrentWorkspace(null);
          // Make sure the user is not on a workspace page eg. /portal/{workspace-slug}/*
          if (
            pathname.includes('/portal/') &&
            !pathname.includes('/portal/profile')
          ) {
            router.push('/portal');
          }
          // Refetch workspace list
          await fetchWorkspaces();
        } else {
          // Switch to the new workspace
          const newWorkspace =
            await workspaceService.switchWorkspace(workspaceSlug);
          if (newWorkspace) {
            setCurrentWorkspace(newWorkspace.data);
            // If router not already on a workspace page, redirect to the dashboards page
            if (!pathname.includes(`/portal/${workspaceSlug}`)) {
              router.push(`/portal/${workspaceSlug}/dashboards`);
            }
          } else {
            throw new Error('Switching workspace failed');
          }
        }
      } finally {
        setWorkspaceLoading(false);
      }
    },
    [
      router,
      pathname,
      setCurrentWorkspace,
      fetchWorkspaces,
      workspaceLoading,
      setWorkspaceLoading,
      workspaceService,
      params,
      currentWorkspace,
    ]
  );
};

/**
 * Hook to delete a workspace.
 * It deletes the workspace using the workspace service, updates the list of workspaces,
 * and resets the current workspace to null.
 * @param switchToWorkspace - Function to switch to a workspace.
 * @param fetchWorkspaces - Function to fetch the list of workspaces.
 * @param locale - The current locale.
 */
export const useDeleteCurrentWorkspace = (
  switchToWorkspace: (
    _workspaceSlug: string | null,
    _disableAlerts?: boolean
  ) => void,
  fetchWorkspaces: () => void,
  locale: string
) => {
  const workspaceService = WorkspaceService.getInstance(locale);
  return useCallback(async () => {
    await workspaceService.deleteWorkspace();
    await switchToWorkspace(null, true);
    await fetchWorkspaces();
  }, [switchToWorkspace, fetchWorkspaces, workspaceService]);
};
