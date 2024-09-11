'use client';

import { useCallback } from 'react';

import { Locale } from '@/dictionaries';
import IrminCore from '@/services/core/IrminCore';

import {
  ActionWorkflow,
  ConnectionWorkflow,
  ExportWorkflow,
  Workflow,
  WorkflowRun,
} from '@/types/api/Workflow';
import { Workspace } from '@/types/api/Workspace';

/**
 * Hook to update a workflow
 *
 * @param locale - The current locale.
 * @param actions - The list of Action Workflows
 * @param setActions - Function to update the Action Workflows
 * @param connections - The list of Connection Workflows
 * @param setConnections - Function to update the Connection Workflows
 * @param exports - The list of Export Workflows
 * @param setExports - Function to update the Export Workflows
 */
export const useUpdateWorkflow = (
  locale: Locale,
  actions: ActionWorkflow[],
  setActions: (actions: ActionWorkflow[]) => void,
  connections: ConnectionWorkflow[],
  setConnections: (connections: ConnectionWorkflow[]) => void,
  exports: ExportWorkflow[],
  setExports: (exports: ExportWorkflow[]) => void
) =>
  useCallback(
    /**
     * Update a workflow using the {@link IrminCore}.
     * Update the local context state accordingly.
     *
     * @param workflowId - The ID of the workflow to update
     * @param updatedWorkflow - The updated workflow object
     */
    async (workflowId: number, updatedWorkflow: Workflow) => {
      // Update the workflow using the workflow service
      const { workflowService } = new IrminCore(locale);
      const response = await workflowService.updateWorkflow(
        workflowId,
        updatedWorkflow
      );
      // Update the local state based on the updated workflow and it's type
      switch (updatedWorkflow.workflowable_type) {
        case 'action':
          setActions(
            actions.map((action) =>
              action.id === workflowId
                ? (updatedWorkflow as ActionWorkflow)
                : action
            )
          );
          break;
        case 'connection':
          setConnections(
            connections.map((connection) =>
              connection.id === workflowId
                ? (updatedWorkflow as ConnectionWorkflow)
                : connection
            )
          );

          break;
        case 'export':
          setExports(
            exports.map((exportWorkflow) =>
              exportWorkflow.id === workflowId
                ? (updatedWorkflow as ExportWorkflow)
                : exportWorkflow
            )
          );
          break;
      }
      // Return the response
      return response;
    },
    [
      locale,
      actions,
      setActions,
      connections,
      setConnections,
      exports,
      setExports,
    ]
  );

/**
 * Hook to pause a workflow
 *
 * @param locale - The current locale.
 * @param actions - The list of Action Workflows
 * @param setActions - Function to update the Action Workflows
 * @param connections - The list of Connection Workflows
 * @param setConnections - Function to update the Connection Workflows
 * @param exports - The list of Export Workflows
 * @param setExports - Function to update the Export Workflows
 */
export const usePauseWorkflow = (
  locale: Locale,
  actions: ActionWorkflow[],
  setActions: (actions: ActionWorkflow[]) => void,
  connections: ConnectionWorkflow[],
  setConnections: (connections: ConnectionWorkflow[]) => void,
  exports: ExportWorkflow[],
  setExports: (exports: ExportWorkflow[]) => void
) =>
  useCallback(
    /**
     * Pause a workflow using the {@link IrminCore}.
     * Update the local context state accordingly.
     *
     * @param workflowId - The ID of the workflow to pause object
     */
    async (workflowId: number) => {
      // Pause the workflow
      const { workflowService } = new IrminCore(locale);
      const response = await workflowService.pauseWorkflow(workflowId);
      // Update the local state based on the paused workflow and it's type
      const pausedWorkflow =
        actions.find((action) => action.id === workflowId) ??
        connections.find((connection) => connection.id === workflowId) ??
        exports.find((exportWorkflow) => exportWorkflow.id === workflowId);
      if (pausedWorkflow) {
        switch (pausedWorkflow.workflowable_type) {
          case 'action':
            setActions(
              actions.map((action) =>
                action.id === workflowId
                  ? { ...action, status: 'paused' }
                  : action
              )
            );
            break;
          case 'connection':
            setConnections(
              connections.map((connection) =>
                connection.id === workflowId
                  ? { ...connection, status: 'paused' }
                  : connection
              )
            );
            break;
          case 'export':
            setExports(
              exports.map((exportWorkflow) =>
                exportWorkflow.id === workflowId
                  ? { ...exportWorkflow, status: 'paused' }
                  : exportWorkflow
              )
            );
            break;
        }
      }
      // Return the response
      return response;
    },
    [
      locale,
      actions,
      setActions,
      connections,
      setConnections,
      exports,
      setExports,
    ]
  );

/**
 * Hook to resume a workflow
 *
 * @param locale - The current locale.
 * @param actions - The list of Action Workflows
 * @param setActions - Function to update the Action Workflows
 * @param connections - The list of Connection Workflows
 * @param setConnections - Function to update the Connection Workflows
 * @param exports - The list of Export Workflows
 * @param setExports - Function to update the Export Workflows
 */
export const useResumeWorkflow = (
  locale: Locale,
  actions: ActionWorkflow[],
  setActions: (actions: ActionWorkflow[]) => void,
  connections: ConnectionWorkflow[],
  setConnections: (connections: ConnectionWorkflow[]) => void,
  exports: ExportWorkflow[],
  setExports: (exports: ExportWorkflow[]) => void
) =>
  useCallback(
    /**
     * Resume a workflow using the {@link IrminCore}.
     * Update the local context state accordingly.
     *
     * @param workflowId - The ID of the workflow to resume object
     */
    async (workflowId: number) => {
      // Resume the workflow
      const { workflowService } = new IrminCore(locale);
      const response = await workflowService.resumeWorkflow(workflowId);
      // Update the local state based on the resumed workflow and it's type
      const resumedWorkflow =
        actions.find((action) => action.id === workflowId) ??
        connections.find((connection) => connection.id === workflowId) ??
        exports.find((exportWorkflow) => exportWorkflow.id === workflowId);
      if (resumedWorkflow) {
        switch (resumedWorkflow.workflowable_type) {
          case 'action':
            setActions(
              actions.map((action) =>
                action.id === workflowId
                  ? { ...action, status: 'initiating' }
                  : action
              )
            );
            break;
          case 'connection':
            setConnections(
              connections.map((connection) =>
                connection.id === workflowId
                  ? { ...connection, status: 'initiating' }
                  : connection
              )
            );
            break;
          case 'export':
            setExports(
              exports.map((exportWorkflow) =>
                exportWorkflow.id === workflowId
                  ? { ...exportWorkflow, status: 'initiating' }
                  : exportWorkflow
              )
            );
            break;
        }
      }
      // Return the response
      return response;
    },
    [
      locale,
      actions,
      setActions,
      connections,
      setConnections,
      exports,
      setExports,
    ]
  );

/**
 * Hook to delete a workflow
 *
 * @param locale - The current locale.
 * @param actions - The list of Action Workflows
 * @param setActions - Function to update the Action Workflows
 * @param connections - The list of Connection Workflows
 * @param setConnections - Function to update the Connection Workflows
 * @param exports - The list of Export Workflows
 * @param setExports - Function to update the Export Workflows
 */
export const useDeleteWorkflow = (
  locale: Locale,
  actions: ActionWorkflow[],
  setActions: (actions: ActionWorkflow[]) => void,
  connections: ConnectionWorkflow[],
  setConnections: (connections: ConnectionWorkflow[]) => void,
  exports: ExportWorkflow[],
  setExports: (exports: ExportWorkflow[]) => void
) =>
  useCallback(
    /**
     * Delete a workflow using the {@link IrminCore}.
     * Update the local context state accordingly.
     *
     * @param workflowId - The ID of the workflow to delete object
     */
    async (workflowId: number) => {
      // Delete the workflow
      const { workflowService } = new IrminCore(locale);
      const response = await workflowService.deleteWorkflow(workflowId);
      // Update the local state based on the deleted workflow and it's type
      const deletedWorkflow =
        actions.find((action) => action.id === workflowId) ??
        connections.find((connection) => connection.id === workflowId) ??
        exports.find((exportWorkflow) => exportWorkflow.id === workflowId);
      if (deletedWorkflow) {
        switch (deletedWorkflow.workflowable_type) {
          case 'action':
            setActions(actions.filter((action) => action.id !== workflowId));
            break;
          case 'connection':
            setConnections(
              connections.filter((connection) => connection.id !== workflowId)
            );
            break;
          case 'export':
            setExports(
              exports.filter(
                (exportWorkflow) => exportWorkflow.id !== workflowId
              )
            );
            break;
        }
      }
      // Return the response
      return response;
    },
    [
      locale,
      actions,
      setActions,
      connections,
      setConnections,
      exports,
      setExports,
    ]
  );

/**
 * Hook to fetch the list of Workflow Runs for the current workspace.
 *
 * @param currentWorkspace - The current workspace
 * @param setWorkflowRuns - Function to update the Workflow Runs state.
 * @param loading - Loading state to prevent multiple simultaneous fetches.
 * @param setLoading - Function to update the loading state.
 * @param fetchedFor - The slug of the workspace workflows are fetched for.
 * @param setFetchedFor - Function to update fetched for state.
 * @param locale - The current locale.
 */
export const useFetchWorkflowRuns = (
  currentWorkspace: Workspace | null,
  setWorkflowRuns: React.Dispatch<React.SetStateAction<WorkflowRun[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Fetch and update context for Workflow Runs of the current workspace using the {@link IrminCore}.
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
          setWorkflowRuns([]);
          return;
        }
        // Fetch the workflow runs for the current workspace
        const response = await workflowService.fetchRuns();
        setWorkflowRuns(response.data);
      } finally {
        setLoading(false);
      }
    },
    [
      currentWorkspace,
      setWorkflowRuns,
      loading,
      setLoading,
      fetchedFor,
      setFetchedFor,
      locale,
    ]
  );

/**
 * Hook to fetch the list of Workflow Runs for a specific workflow.
 *
 * @param workflowRuns - The list of the current Workflow Runs
 * @param setWorkflowRuns - Function to update the Workflow Runs state.
 * @param loading - Loading state to prevent multiple simultaneous fetches.
 * @param setLoading - Function to update the loading state.
 * @param locale - The current locale.
 */
export const useFetchWorkflowRunsByWorkflow = (
  workflowRuns: WorkflowRun[],
  setWorkflowRuns: React.Dispatch<React.SetStateAction<WorkflowRun[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Fetch Workflow Runs using the {@link IrminCore}.
     * @param workflowId - The ID of the workflow to fetch runs for.
     *
     * @returns The list of Workflow Runs for the Workflow or throws an error
     */
    async (workflowId: number) => {
      // Prevent multiple simultaneous fetches
      if (loading) return;
      setLoading(true);
      try {
        // Get the workflow service
        const { workflowService } = new IrminCore(locale);
        // Fetch the workflow runs for the current workspace
        const response = await workflowService.fetchRunsByWorkflow(workflowId);
        // Update the local state with the fetched workflow runs
        const fetchedRuns = response.data;
        const newWorkflowRuns = [...workflowRuns];
        // Remove the fetched runs from the current list
        fetchedRuns.forEach((run) => {
          const index = newWorkflowRuns.findIndex((r) => r.id === run.id);
          if (index !== -1) {
            newWorkflowRuns.splice(index, 1);
          }
        });
        // Add the fetched runs to the current list
        newWorkflowRuns.push(...fetchedRuns);
        // Sort the list by ID and update the state
        setWorkflowRuns(newWorkflowRuns.sort((a, b) => a.id - b.id));
      } finally {
        setLoading(false);
      }
    },
    [workflowRuns, setWorkflowRuns, loading, setLoading, locale]
  );
