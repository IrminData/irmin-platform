'use client';

import { useMemo, useState } from 'react';

import { Locale } from '@/dictionaries';

import {
  ActionWorkflow,
  ExportWorkflow,
  ImportWorkflow,
  WorkflowRun,
} from '@/types/api/Workflow';
import { Workspace } from '@/types/api/Workspace';

import {
  useDeleteWorkflow,
  useFetchActions,
  useFetchExports,
  useFetchImports,
  useFetchWorkflowRuns,
  useFetchWorkflowRunsByWorkflow,
  usePauseWorkflow,
  useReassignWorkflow,
  useResumeWorkflow,
  useUpdateWorkflow,
} from './hooks/workflows';

/**
 * Hook for Workflows to be used in the Workspace Provider
 */
const useWorkflows = ({
  currentWorkspace,
  locale,
}: {
  currentWorkspace: Workspace | null;
  locale: Locale;
}) => {
  // Workflow Runs
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [workflowRunsLoading, setWorkflowRunsLoading] = useState(false);
  const [workflowRunsFetchedFor, setWorkflowRunsFetchedFor] = useState<
    string | null
  >(null);

  // Import workflows
  const [imports, setImports] = useState<ImportWorkflow[]>([]);
  const [importsLoading, setImportsLoading] = useState(false);
  const [importsFetchedFor, setImportsFetchedFor] = useState<string | null>(
    null
  );
  const fetchImports = useFetchImports(
    currentWorkspace,
    setImports,
    importsLoading,
    setImportsLoading,
    importsFetchedFor,
    setImportsFetchedFor,
    locale
  );

  // Export workflows
  const [exports, setExports] = useState<ExportWorkflow[]>([]);
  const [exportsLoading, setExportsLoading] = useState(false);
  const [exportsFetchedFor, setExportsFetchedFor] = useState<string | null>(
    null
  );
  const fetchExports = useFetchExports(
    currentWorkspace,
    setExports,
    exportsLoading,
    setExportsLoading,
    exportsFetchedFor,
    setExportsFetchedFor,
    locale
  );

  // Action workflows
  const [actions, setActions] = useState<ActionWorkflow[]>([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [actionsFetchedFor, setActionsFetchedFor] = useState<string | null>(
    null
  );
  const fetchActions = useFetchActions(
    currentWorkspace,
    setActions,
    actionsLoading,
    setActionsLoading,
    actionsFetchedFor,
    setActionsFetchedFor,
    locale
  );

  // Construct "all workflows" object from imports, exports and actions
  const allWorkflows = useMemo(
    () => [...actions, ...imports, ...exports].sort((a, b) => a.id - b.id),
    [actions, imports, exports]
  );

  // Workflow Runs
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
    workflowRuns,
    setWorkflowRuns,
    workflowRunsLoading,
    setWorkflowRunsLoading,
    locale
  );

  // Hooks for updating, reassigning, deleting, pausing and resuming workflows
  const updateWorkflow = useUpdateWorkflow(
    locale,
    actions,
    setActions,
    imports,
    setImports,
    exports,
    setExports
  );
  const reassignWorkflow = useReassignWorkflow(
    locale,
    actions,
    setActions,
    imports,
    setImports,
    exports,
    setExports
  );
  const deleteWorkflow = useDeleteWorkflow(
    locale,
    actions,
    setActions,
    imports,
    setImports,
    exports,
    setExports
  );
  const pauseWorkflow = usePauseWorkflow(
    locale,
    actions,
    setActions,
    imports,
    setImports,
    exports,
    setExports
  );
  const resumeWorkflow = useResumeWorkflow(
    locale,
    actions,
    setActions,
    imports,
    setImports,
    exports,
    setExports
  );

  return {
    imports,
    importsLoading,
    fetchImports,
    setImports,
    exports,
    exportsLoading,
    fetchExports,
    setExports,
    actions,
    actionsLoading,
    fetchActions,
    setActions,
    allWorkflows,
    workflowRuns,
    workflowRunsLoading,
    fetchWorkflowRuns,
    fetchWorkflowRunsByWorkflow,
    updateWorkflow,
    reassignWorkflow,
    deleteWorkflow,
    pauseWorkflow,
    resumeWorkflow,
  };
};

export default useWorkflows;
