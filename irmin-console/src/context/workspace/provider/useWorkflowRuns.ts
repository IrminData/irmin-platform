'use client';

import { useState } from 'react';

import { Locale } from '@/dictionaries';

import {
  useFetchWorkflowRuns,
  useFetchWorkflowRunsByWorkflow,
} from '@/context/workspace';

import { WorkflowRun } from '@/types/api/Workflow';
import { Workspace } from '@/types/api/Workspace';

/**
 * Combined hook for Workflow Runs to be used in the Workspace Provider
 *
 * @param workspaceProps - The workspace properties
 * @param workspaceProps.currentWorkspace - The current workspace
 * @param workspaceProps.locale - The locale to use for the API calls
 */
const useWorkflowRuns = ({
  currentWorkspace,
  locale,
}: {
  currentWorkspace: Workspace | null;
  locale: Locale;
}) => {
  // WorkflowRuns
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [workflowRunsLoading, setWorkflowRunsLoading] = useState(false);
  const [workflowRunsFetchedFor, setWorkflowRunsFetchedFor] = useState<
    string | null
  >(null);

  /**
   * Hook to fetch the workflowRuns for the current workspace.
   * It will be run whenever the current workspace changes to update the workflowRuns.
   */
  const fetchWorkflowRuns = useFetchWorkflowRuns(
    currentWorkspace,
    setWorkflowRuns,
    workflowRunsLoading,
    setWorkflowRunsLoading,
    workflowRunsFetchedFor,
    setWorkflowRunsFetchedFor,
    locale
  );

  const fetchWorkflowRunsByWorkflow = useFetchWorkflowRunsByWorkflow(
    workflowRunsLoading,
    setWorkflowRunsLoading,
    locale
  );

  return {
    workflowRuns,
    workflowRunsLoading,
    fetchWorkflowRuns,
    fetchWorkflowRunsByWorkflow,
  };
};

export default useWorkflowRuns;
