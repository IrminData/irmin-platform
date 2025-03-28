'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  deleteWorkflow,
  getWorkflow,
  pauseWorkflow,
  resumeWorkflow,
  transferWorkflow,
  triggerWorkflowRun,
  updateWorkflow,
} from '@/lib/actions/workflows';

import { Workflow, WorkflowRun } from '@/types/core/Workflow';
import { ItemUpdateProps } from '@/types/internal/ItemUpdateProps';

import { useLocale } from './LocaleContext';
import { usePopup } from './PopupContext';

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

  // Track if the workflow is being updated
  const updating = useRef(false);

  // Active Workflow for the context
  const [workflow, setWorkflow] = useState(initialWorkflow);
  const workflowID = useMemo(() => workflow.id, [workflow.id]);

  const fetchWorkflow = useCallback(async () => {
    try {
      const newWorkflow = await getWorkflow(workflowID);
      if (!newWorkflow) return;
      setWorkflow(newWorkflow);
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to fetch the workflow'
      );
    }
  }, [workflowID, irminAlert]);

  const handleDeleteWorkflow = useCallback(async () => {
    const confirmed = await irminConfirm(
      'warning',
      `${dict.common.areYouSureYouWantToDelete} (${workflow.name})`
    );
    if (updating.current || !confirmed) return;
    try {
      updating.current = true;
      const res = await deleteWorkflow(workflow.id);
      irminAlert('success', res.message ?? 'Workflow deleted successfully');
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Error deleting the workflow'
      );
    } finally {
      updating.current = false;
    }
  }, [workflow, dict, irminAlert, irminConfirm]);

  const handleUpdateWorkflow = useCallback(
    async (data: ItemUpdateProps) => {
      if (updating.current) return;
      try {
        updating.current = true;
        const res = await updateWorkflow(workflow.id, data);
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
    [workflow, fetchWorkflow, irminAlert]
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
        const res = await transferWorkflow(workflow.id, ownerID);
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
    [workflow, dict, fetchWorkflow, irminAlert, irminConfirm]
  );

  const handlePauseWorkflow = useCallback(async () => {
    if (updating.current) return;
    try {
      updating.current = true;
      const res = await pauseWorkflow(workflowID);
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
  }, [workflowID, fetchWorkflow, irminAlert]);

  const handleResumeWorkflow = useCallback(async () => {
    if (updating.current) return;
    try {
      updating.current = true;
      const res = await resumeWorkflow(workflowID);
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
  }, [workflowID, fetchWorkflow, irminAlert]);

  const handleTriggerWorkflowRun = useCallback(async () => {
    if (updating.current) return;
    try {
      updating.current = true;
      const res = await triggerWorkflowRun(workflowID);
      irminAlert('success', res.message ?? 'Workflow run triggered');
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to trigger the workflow run'
      );
    } finally {
      updating.current = false;
    }
  }, [workflowID, irminAlert]);

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
