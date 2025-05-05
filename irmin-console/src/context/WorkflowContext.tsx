'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/WorkspaceContext';

import useWorkflowRuns from '@/hooks/useWorkflowRuns';

import { Connection } from '@/types/core/Connection';
import { Repository } from '@/types/core/Repository';
import { Workflow } from '@/types/core/Workflow';
import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

/**
 * Workflow context properties
 */
interface WorkflowContextProps {
  workflow: Workflow;
  connections: Connection[];
  repositories: Repository[];
  fetchWorkflow: () => Promise<void>;
  updateWorkflow: (data: ItemUpdateProps) => Promise<void>;
  transferWorkflow: (ownerID: string) => Promise<void>;
  deleteWorkflow: () => Promise<void>;
  pauseWorkflow: () => Promise<void>;
  resumeWorkflow: () => Promise<void>;
  runningWorkflow: boolean;
  triggerWorkflowRun: () => Promise<void>;
  workflowRuns: ReturnType<typeof useWorkflowRuns>;
}

const WorkflowContext = createContext<WorkflowContextProps | undefined>(
  undefined
);

/**
 * Workflow context for state management and interactions with workflows of the workspace
 *
 * @param props - The properties of the workflow provider
 * @param props.children - The children components
 * @param props.initialWorkflow - The initial workflow to set
 * @param props.connections - The connections of the workflow
 * @param props.repositories - The repositories of the workflow
 */
export const WorkflowProvider = ({
  children,
  initialWorkflow,
  connections,
  repositories,
}: {
  children: React.ReactNode;
  initialWorkflow: Workflow;
  connections: Connection[];
  repositories: Repository[];
}) => {
  const { getToken } = useIAM();
  const { dict, locale } = useLocale();
  const { irminAlert, irminConfirm } = usePopup();
  const { workspaceSlug } = useWorkspace();

  // Workflow runs for the workflow
  const workflowRuns = useWorkflowRuns(initialWorkflow.id);

  // Track if the workflow is being updated
  const updating = useRef(false);

  // Active Workflow for the context
  const [workflow, setWorkflow] = useState(initialWorkflow);
  const workflowID = useMemo(() => workflow.id, [workflow.id]);

  const fetchWorkflow = useCallback(async () => {
    try {
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const newWorkflow = await irminCore.workflowService.fetchWorkflow({
        workspace: workspaceSlug,
        workflowID,
      });
      if (!newWorkflow.data) return;
      setWorkflow(newWorkflow.data);
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch the workflow'
      );
    }
  }, [workflowID, workspaceSlug, irminAlert, getToken, locale]);

  const handleDeleteWorkflow = useCallback(async () => {
    const confirmed = await irminConfirm(
      'warning',
      `${dict.common.areYouSureYouWantToDelete} (${workflow.name})`
    );
    if (updating.current || !confirmed) return;
    try {
      updating.current = true;
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const res = await irminCore.workflowService.deleteWorkflow({
        workspace: workspaceSlug,
        workflowID: workflow.id,
      });
      irminAlert('success', res.message ?? 'Workflow deleted successfully');
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error deleting the workflow'
      );
    } finally {
      updating.current = false;
    }
  }, [
    workflow,
    dict,
    workspaceSlug,
    irminAlert,
    irminConfirm,
    getToken,
    locale,
  ]);

  const handleUpdateWorkflow = useCallback(
    async (data: ItemUpdateProps) => {
      if (updating.current) return;
      try {
        updating.current = true;
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.workflowService.updateWorkflow({
          workspace: workspaceSlug,
          workflowID,
          name: data.name,
          description: data.description,
          documentation: data.documentation,
        });
        if (data.schedule) {
          await irminCore.workflowService.updateWorkflowSchedule({
            workspace: workspaceSlug,
            workflowID,
            schedule: data.schedule,
          });
        }
        await fetchWorkflow();
        irminAlert('success', res.message ?? 'Workflow updated successfully');
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error updating the workflow'
        );
      } finally {
        updating.current = false;
      }
    },
    [workflowID, workspaceSlug, fetchWorkflow, irminAlert, getToken, locale]
  );

  const handleTransferOwnershipWorkflow = useCallback(
    async (ownerID: string) => {
      const confirmed = await irminConfirm(
        'warning',
        `${dict.common.areYouSureYouWantToTransferOwnership} (${workflow.name})`
      );
      if (updating.current || !confirmed) return;
      try {
        updating.current = true;
        const token = await getToken();
        const irminCore = new IrminCore(locale, token);
        const res = await irminCore.workflowService.transferWorkflow({
          workspace: workspaceSlug,
          workflowID,
          newOwnerID: ownerID,
        });
        await fetchWorkflow();
        irminAlert(
          'success',
          res.message ?? 'Workflow transfered successfully'
        );
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Error transfering the workflow'
        );
      } finally {
        updating.current = false;
      }
    },
    [
      workflow,
      workflowID,
      workspaceSlug,
      dict,
      fetchWorkflow,
      irminAlert,
      irminConfirm,
      getToken,
      locale,
    ]
  );

  const handlePauseWorkflow = useCallback(async () => {
    if (updating.current) return;
    try {
      updating.current = true;
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const res = await irminCore.workflowService.pauseWorkflow({
        workspace: workspaceSlug,
        workflowID,
      });
      await fetchWorkflow();
      irminAlert('success', res.message ?? 'Workflow paused successfully');
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to pause the workflow'
      );
    } finally {
      updating.current = false;
    }
  }, [workflowID, workspaceSlug, fetchWorkflow, irminAlert, getToken, locale]);

  const handleResumeWorkflow = useCallback(async () => {
    if (updating.current) return;
    try {
      updating.current = true;
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const res = await irminCore.workflowService.startWorflow({
        workspace: workspaceSlug,
        workflowID,
      });
      await fetchWorkflow();
      irminAlert('success', res.message ?? 'Workflow resumed successfully');
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to resume the workflow'
      );
    } finally {
      updating.current = false;
    }
  }, [workflowID, workspaceSlug, fetchWorkflow, irminAlert, getToken, locale]);

  const [runningWorkflow, setRunningWorkflow] = useState(false);
  const handleTriggerWorkflowRun = useCallback(async () => {
    if (updating.current) return;
    try {
      setRunningWorkflow(true);
      updating.current = true;
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const res = await irminCore.workflowRunService.triggerWorkflowRun({
        workspace: workspaceSlug,
        workflowID,
      });
      workflowRuns.resetAndFetch();
      irminAlert('success', res.message ?? 'Workflow run triggered');
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to trigger the workflow run'
      );
    } finally {
      setRunningWorkflow(false);
      updating.current = false;
    }
  }, [workflowID, workspaceSlug, workflowRuns, irminAlert, getToken, locale]);

  return (
    <WorkflowContext.Provider
      value={{
        workflow,
        connections,
        repositories,
        fetchWorkflow,
        deleteWorkflow: handleDeleteWorkflow,
        updateWorkflow: handleUpdateWorkflow,
        transferWorkflow: handleTransferOwnershipWorkflow,
        pauseWorkflow: handlePauseWorkflow,
        resumeWorkflow: handleResumeWorkflow,
        runningWorkflow,
        triggerWorkflowRun: handleTriggerWorkflowRun,
        workflowRuns,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
};

/**
 * Hook to use the workflow context
 */
export const useWorkflow = (): WorkflowContextProps => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
};
