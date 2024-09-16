'use client';

import { useCallback } from 'react';

import { Locale } from '@/dictionaries';
import IrminCore from '@/services/core/IrminCore';

import {
  ActionWorkflow,
  ExportWorkflow,
  ImportWorkflow,
  Workflow,
} from '@/types/api/Workflow';
import { Workspace, WorkspaceUser } from '@/types/api/Workspace';

/**
 * Hook to fetch and update context for Import Workflows of the current workspace using the {@link IrminCore}.
 */
export const useFetchImports = (
  currentWorkspace: Workspace | null,
  setImports: React.Dispatch<React.SetStateAction<ImportWorkflow[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  locale: Locale
) =>
  useCallback(
    async (forceFetch?: boolean) => {
      // Check if the imports are already fetched for the current workspace
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
        // If the current workspace is not set, clear the imports
        if (!currentWorkspace) {
          setImports([]);
          return;
        }
        // Fetch the import workflows for the current workspace
        const response = await workflowService.fetchImportWorkflows();
        setImports(response.data);
      } finally {
        setLoading(false);
      }
    },
    [
      currentWorkspace,
      setImports,
      loading,
      setLoading,
      fetchedFor,
      setFetchedFor,
      locale,
    ]
  );

/**
 * Hook to fetch and update context for Export Workflows of the current workspace using the {@link IrminCore}.
 */
export const useFetchExports = (
  currentWorkspace: Workspace | null,
  setExports: React.Dispatch<React.SetStateAction<ExportWorkflow[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  locale: Locale
) =>
  useCallback(
    async (forceFetch?: boolean) => {
      // Check if the exports are already fetched for the current workspace
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
        // If the current workspace is not set, clear the exports
        if (!currentWorkspace) {
          setExports([]);
          return;
        }
        // Fetch the Export workflows for the current workspace
        const response = await workflowService.fetchExportWorkflows();
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
 * Hook to fetch and update context for Action Workflows of the current workspace using the {@link IrminCore}.
 */
export const useFetchActions = (
  currentWorkspace: Workspace | null,
  setActions: React.Dispatch<React.SetStateAction<ActionWorkflow[]>>,
  loading: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  fetchedFor: string | null,
  setFetchedFor: React.Dispatch<React.SetStateAction<string | null>>,
  locale: Locale
) =>
  useCallback(
    async (forceFetch?: boolean) => {
      // Check if the Actions are already fetched for the current workspace
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
        // If the current workspace is not set, clear the Actions
        if (!currentWorkspace) {
          setActions([]);
          return;
        }
        // Fetch the Action workflows for the current workspace
        const response = await workflowService.fetchActionWorkflows();
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
 * Hook to update a workflow using the {@link IrminCore}.
 */
export const useUpdateWorkflow = (
  locale: Locale,
  actions: ActionWorkflow[],
  setActions: (actions: ActionWorkflow[]) => void,
  imports: ImportWorkflow[],
  setImports: (imports: ImportWorkflow[]) => void,
  exports: ExportWorkflow[],
  setExports: (exports: ExportWorkflow[]) => void
) =>
  useCallback(
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
        case 'import':
          setImports(
            imports.map((importWorkflow) =>
              importWorkflow.id === workflowId
                ? (updatedWorkflow as ImportWorkflow)
                : importWorkflow
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
    [locale, actions, setActions, imports, setImports, exports, setExports]
  );

/**
 * Hook to reassign a workflow to a new owner using the {@link IrminCore}.
 */
export const useReassignWorkflow = (
  locale: Locale,
  actions: ActionWorkflow[],
  setActions: (actions: ActionWorkflow[]) => void,
  imports: ImportWorkflow[],
  setImports: (imports: ImportWorkflow[]) => void,
  exports: ExportWorkflow[],
  setExports: (exports: ExportWorkflow[]) => void
) =>
  useCallback(
    async (workflowId: number, newOwner: WorkspaceUser) => {
      // Reassign the workflow using the workflow service
      const { workflowService } = new IrminCore(locale);
      const response = await workflowService.reassignWorkflow(
        workflowId,
        newOwner
      );
      // Update the local state based on the reassigned workflow and it's type
      const reassignedWorkflow =
        actions.find((action) => action.id === workflowId) ??
        imports.find((importWorkflow) => importWorkflow.id === workflowId) ??
        exports.find((exportWorkflow) => exportWorkflow.id === workflowId);
      if (reassignedWorkflow) {
        switch (reassignedWorkflow.workflowable_type) {
          case 'action':
            setActions(
              actions.map((action) =>
                action.id === workflowId
                  ? { ...action, owner: newOwner }
                  : action
              )
            );
            break;
          case 'import':
            setImports(
              imports.map((importWorkflow) =>
                importWorkflow.id === workflowId
                  ? { ...importWorkflow, owner: newOwner }
                  : importWorkflow
              )
            );
            break;
          case 'export':
            setExports(
              exports.map((exportWorkflow) =>
                exportWorkflow.id === workflowId
                  ? { ...exportWorkflow, owner: newOwner }
                  : exportWorkflow
              )
            );
            break;
        }
      }
      // Return the response
      return response;
    },
    [locale, actions, setActions, imports, setImports, exports, setExports]
  );

/**
 * Hook to pause a workflow using the {@link IrminCore}.
 */
export const usePauseWorkflow = (
  locale: Locale,
  actions: ActionWorkflow[],
  setActions: (actions: ActionWorkflow[]) => void,
  imports: ImportWorkflow[],
  setImports: (imports: ImportWorkflow[]) => void,
  exports: ExportWorkflow[],
  setExports: (exports: ExportWorkflow[]) => void
) =>
  useCallback(
    async (workflowId: number) => {
      // Pause the workflow
      const { workflowService } = new IrminCore(locale);
      const response = await workflowService.pauseWorkflow(workflowId);
      // Update the local state based on the paused workflow and it's type
      const pausedWorkflow =
        actions.find((action) => action.id === workflowId) ??
        imports.find((importWorkflow) => importWorkflow.id === workflowId) ??
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
          case 'import':
            setImports(
              imports.map((importWorkflow) =>
                importWorkflow.id === workflowId
                  ? { ...importWorkflow, status: 'paused' }
                  : importWorkflow
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
    [locale, actions, setActions, imports, setImports, exports, setExports]
  );

/**
 * Hook to resume a workflow using the {@link IrminCore}.
 */
export const useResumeWorkflow = (
  locale: Locale,
  actions: ActionWorkflow[],
  setActions: (actions: ActionWorkflow[]) => void,
  imports: ImportWorkflow[],
  setImports: (imports: ImportWorkflow[]) => void,
  exports: ExportWorkflow[],
  setExports: (exports: ExportWorkflow[]) => void
) =>
  useCallback(
    async (workflowId: number) => {
      // Resume the workflow
      const { workflowService } = new IrminCore(locale);
      const response = await workflowService.resumeWorkflow(workflowId);
      // Update the local state based on the resumed workflow and it's type
      const resumedWorkflow =
        actions.find((action) => action.id === workflowId) ??
        imports.find((importWorkflow) => importWorkflow.id === workflowId) ??
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
          case 'import':
            setImports(
              imports.map((importWorkflow) =>
                importWorkflow.id === workflowId
                  ? { ...importWorkflow, status: 'initiating' }
                  : importWorkflow
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
    [locale, actions, setActions, imports, setImports, exports, setExports]
  );

/**
 * Hook to delete a workflow using the {@link IrminCore}.
 */
export const useDeleteWorkflow = (
  locale: Locale,
  actions: ActionWorkflow[],
  setActions: (actions: ActionWorkflow[]) => void,
  imports: ImportWorkflow[],
  setImports: (imports: ImportWorkflow[]) => void,
  exports: ExportWorkflow[],
  setExports: (exports: ExportWorkflow[]) => void
) =>
  useCallback(
    async (workflowId: number) => {
      // Delete the workflow
      const { workflowService } = new IrminCore(locale);
      const response = await workflowService.deleteWorkflow(workflowId);
      // Update the local state based on the deleted workflow and it's type
      const deletedWorkflow =
        actions.find((action) => action.id === workflowId) ??
        imports.find((importWorkflow) => importWorkflow.id === workflowId) ??
        exports.find((exportWorkflow) => exportWorkflow.id === workflowId);
      if (deletedWorkflow) {
        switch (deletedWorkflow.workflowable_type) {
          case 'action':
            setActions(actions.filter((action) => action.id !== workflowId));
            break;
          case 'import':
            setImports(
              imports.filter(
                (importWorkflow) => importWorkflow.id !== workflowId
              )
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
    [locale, actions, setActions, imports, setImports, exports, setExports]
  );
