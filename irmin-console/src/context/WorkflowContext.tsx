'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import { triggerWorkflowRun } from '@/lib/actions/workflow-runs';
import {
  deleteWorkflow,
  getWorkflow,
  pauseWorkflow,
  startWorkflow,
  transferWorkflow,
  updateWorkflow,
  updateWorkflowSchedule,
} from '@/lib/actions/workflows';

import { Workflow } from '@/types/core/Workflow';
import { WorkflowRun } from '@/types/core/WorkflowRun';
import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

import { useLocale } from './LocaleContext';
import { usePopup } from './PopupContext';
import { useWorkspace } from './WorkspaceContext';

/**
 * Workflow context properties
 */
interface WorkflowContextProps {
  workflow: Workflow;
  runs: WorkflowRun[];
  fetchWorkflow: () => Promise<void>;
  updateWorkflow: (data: ItemUpdateProps) => Promise<void>;
  transferWorkflow: (ownerID: string) => Promise<void>;
  deleteWorkflow: () => Promise<void>;
  pauseWorkflow: () => Promise<void>;
  resumeWorkflow: () => Promise<void>;
  triggerWorkflowRun: () => Promise<void>;
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
 * @param props.runs - The runs of the workflow
 */
export const WorkflowProvider = ({
  children,
  initialWorkflow,
  runs,
}: {
  children: React.ReactNode;
  initialWorkflow: Workflow;
  runs: WorkflowRun[];
}) => {
  const { dict } = useLocale();
  const { irminAlert, irminConfirm } = usePopup();
  const { workspaceSlug } = useWorkspace();

  // Track if the workflow is being updated
  const updating = useRef(false);

  // Active Workflow for the context
  const [workflow, setWorkflow] = useState(initialWorkflow);
  const workflowID = useMemo(() => workflow.id, [workflow.id]);

  const fetchWorkflow = useCallback(async () => {
    try {
      const newWorkflow = await getWorkflow({
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
  }, [workflowID, workspaceSlug, irminAlert]);

  const handleDeleteWorkflow = useCallback(async () => {
    const confirmed = await irminConfirm(
      'warning',
      `${dict.common.areYouSureYouWantToDelete} (${workflow.name})`
    );
    if (updating.current || !confirmed) return;
    try {
      updating.current = true;
      const res = await deleteWorkflow({
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
  }, [workflow, dict, workspaceSlug, irminAlert, irminConfirm]);

  const handleUpdateWorkflow = useCallback(
    async (data: ItemUpdateProps) => {
      if (updating.current) return;
      try {
        updating.current = true;
        const res = await updateWorkflow({
          workspace: workspaceSlug,
          workflowID,
          name: data.name,
          description: data.description,
          documentation: data.documentation,
        });
        if (data.schedule) {
          await updateWorkflowSchedule({
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
    [workflowID, workspaceSlug, fetchWorkflow, irminAlert]
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
        const res = await transferWorkflow({
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
    ]
  );

  const handlePauseWorkflow = useCallback(async () => {
    if (updating.current) return;
    try {
      updating.current = true;
      const res = await pauseWorkflow({
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
  }, [workflowID, workspaceSlug, fetchWorkflow, irminAlert]);

  const handleResumeWorkflow = useCallback(async () => {
    if (updating.current) return;
    try {
      updating.current = true;
      const res = await startWorkflow({
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
  }, [workflowID, workspaceSlug, fetchWorkflow, irminAlert]);

  const handleTriggerWorkflowRun = useCallback(async () => {
    if (updating.current) return;
    try {
      updating.current = true;
      const res = await triggerWorkflowRun({
        workspace: workspaceSlug,
        workflowID,
      });
      irminAlert('success', res.message ?? 'Workflow run triggered');
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to trigger the workflow run'
      );
    } finally {
      updating.current = false;
    }
  }, [workflowID, workspaceSlug, irminAlert]);

  return (
    <WorkflowContext.Provider
      value={{
        workflow,
        runs,
        fetchWorkflow,
        deleteWorkflow: handleDeleteWorkflow,
        updateWorkflow: handleUpdateWorkflow,
        transferWorkflow: handleTransferOwnershipWorkflow,
        pauseWorkflow: handlePauseWorkflow,
        resumeWorkflow: handleResumeWorkflow,
        triggerWorkflowRun: handleTriggerWorkflowRun,
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
