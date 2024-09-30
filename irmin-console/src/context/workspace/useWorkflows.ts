'use client';

import { useMemo, useState } from 'react';

import { Locale } from '@/dictionaries';

import {
  ActionWorkflow,
  ExportWorkflow,
  ImportWorkflow,
} from '@/types/core/Workflow';
import { Workspace } from '@/types/core/Workspace';

import {
  useDeleteWorkflow,
  useFetchActions,
  useFetchExports,
  useFetchImports,
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
    () => [...actions, ...imports, ...exports],
    [actions, imports, exports]
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
    updateWorkflow,
    reassignWorkflow,
    deleteWorkflow,
    pauseWorkflow,
    resumeWorkflow,
  };
};

export default useWorkflows;
