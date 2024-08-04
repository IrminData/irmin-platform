'use client';

import { useState } from 'react';

import { Locale } from '@/dictionaries';

import {
  useDeleteWorkflow,
  useFetchWorkflowRuns,
  useFetchWorkflowRunsByWorkflow,
  usePauseWorkflow,
  useResumeWorkflow,
  useUpdateWorkflow,
} from '@/context/workspace/hooks/workflows';

import {
  ActionWorkflow,
  ConnectionWorkflow,
  ExportWorkflow,
  WorkflowRun,
} from '@/types/api/Workflow';
import { Workspace } from '@/types/api/Workspace';

/**
 * Combined hook for Workflows to be used in the Workspace Provider
 *
 * @remarks
 *
 * Handles Workflow logic not specific to a single Workflow type,
 * like ownership transfer, pause, resume etc.
 *
 * In addition it provides {@link WorkflowRun} related logic.
 *
 * @param workspaceProps - The workspace properties
 * @param workspaceProps.actions - The action workflows
 * @param workspaceProps.setActions - Function to set the action workflows
 * @param workspaceProps.connections - The connection workflows
 * @param workspaceProps.setConnections - Function to set the connection workflows
 * @param workspaceProps.exports - The export workflows
 * @param workspaceProps.setExports - Function to set the export workflows
 * @param workspaceProps.currentWorkspace - The current workspace
 * @param workspaceProps.locale - The locale to use for the API calls
 */
const useWorkflows = ({
  actions,
  setActions,
  connections,
  setConnections,
  exports,
  setExports,
  currentWorkspace,
  locale,
}: {
  actions: ActionWorkflow[];
  setActions: (actions: ActionWorkflow[]) => void;
  connections: ConnectionWorkflow[];
  setConnections: (connections: ConnectionWorkflow[]) => void;
  exports: ExportWorkflow[];
  setExports: (exports: ExportWorkflow[]) => void;
  currentWorkspace: Workspace | null;
  locale: Locale;
}) => {
  // Workflow Runs
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [workflowRunsLoading, setWorkflowRunsLoading] = useState(false);
  const [workflowRunsFetchedFor, setWorkflowRunsFetchedFor] = useState<
    string | null
  >(null);

  /**
   * Hook to fetch the Workflow Runs for the current workspace.
   * It will be run whenever the current workspace changes to update the Workflow Runs.
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

  /**
   * Hook to fetch the workflowRuns for a specific workflow.
   */
  const fetchWorkflowRunsByWorkflow = useFetchWorkflowRunsByWorkflow(
    workflowRunsLoading,
    setWorkflowRunsLoading,
    locale
  );

  /**
   * Hook to update a workflow
   */
  const updateWorkflow = useUpdateWorkflow(
    locale,
    actions,
    setActions,
    connections,
    setConnections,
    exports,
    setExports
  );

  /**
   * Hook to delete a workflow
   */
  const deleteWorkflow = useDeleteWorkflow(
    locale,
    actions,
    setActions,
    connections,
    setConnections,
    exports,
    setExports
  );

  /**
   * Hook to pause a workflow
   */
  const pauseWorkflow = usePauseWorkflow(
    locale,
    actions,
    setActions,
    connections,
    setConnections,
    exports,
    setExports
  );

  /**
   * Hook to resume a workflow
   */
  const resumeWorkflow = useResumeWorkflow(
    locale,
    actions,
    setActions,
    connections,
    setConnections,
    exports,
    setExports
  );

  return {
    workflowRuns,
    workflowRunsLoading,
    fetchWorkflowRuns,
    fetchWorkflowRunsByWorkflow,
    updateWorkflow,
    deleteWorkflow,
    pauseWorkflow,
    resumeWorkflow,
  };
};

export default useWorkflows;
