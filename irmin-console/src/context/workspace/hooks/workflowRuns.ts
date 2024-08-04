'use client';

import { useCallback } from 'react';

import { Locale } from '@/dictionaries';
import WorkflowService from '@/services/api/WorkflowService';

import { WorkflowRun } from '@/types/api/Workflow';
import { Workspace } from '@/types/api/Workspace';

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
     * Fetch and update context for Workflow Runs of the current workspace using the {@link WorkflowService}.
     * @param forceFetch - If true, will refetch even if already fetched
     */
    async (forceFetch?: boolean) => {
      // Check if the connections are already fetched for the current workspace
      if (!forceFetch) {
        if (!fetchedFor && !currentWorkspace) return;
        if (fetchedFor === currentWorkspace?.slug) return;
      }
      setFetchedFor(currentWorkspace?.slug ?? null);
      // Get the workflow service
      const workflowService = WorkflowService.getInstance(locale);
      // If the current workspace is not set, clear the connections
      if (!currentWorkspace) {
        setWorkflowRuns([]);
        return;
      }
      try {
        // Prevent multiple simultaneous fetches
        if (loading) return;
        setLoading(true);
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
 * @param loading - Loading state to prevent multiple simultaneous fetches.
 * @param setLoading - Function to update the loading state.
 * @param locale - The current locale.
 */
export const useFetchWorkflowRunsByWorkflow = (
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  locale: Locale
) =>
  useCallback(
    /**
     * Fetch Workflow Runs using the {@link WorkflowService}.
     * @param workflowId - The ID of the workflow to fetch runs for.
     */
    async (workflowId: number) => {
      // Get the workflow service
      const workflowService = WorkflowService.getInstance(locale);
      try {
        // Prevent multiple simultaneous fetches
        if (loading) return;
        setLoading(true);
        // Fetch the workflow runs for the current workspace
        const response = await workflowService.fetchRunsByWorkflow({
          workflowId,
        });
        setLoading(false);
        return response.data;
      } finally {
        setLoading(false);
      }
    },
    [loading, setLoading, locale]
  );
