import { useCallback, useEffect, useRef, useState } from 'react';

import { createWorkflow } from '@/lib/actions/workflows';

import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/WorkspaceContext';

import { WorkflowableType } from '@/types/core/Workflow';
import { WorkflowInput } from '@/types/internal/WorkflowInput';

/**
 * Empty workflow setup data
 */
export const emptyWorkflowSetupData: WorkflowInput = {
  // Workflow properties
  name: '',
  description: '',
  documentation: '',
  schedule: {
    triggers: [],
    max_retries: 3,
    max_runtime: 15,
    min_interval: 120,
  },
  // Workflowable properties
  type: 'action',
  workflowable: {
    type: 'action',
    executable: '',
  },
};

export const useWorkflowCreation = (
  isOpen: boolean,
  workflowType: WorkflowableType,
  initialWorkflowData: WorkflowInput | undefined,
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>
) => {
  const [workflowData, setWorkflowData] = useState<WorkflowInput>({
    ...emptyWorkflowSetupData,
    ...(initialWorkflowData ?? {}),
    type: workflowType,
  });

  useEffect(() => {
    setCurrentStep(1);
    setWorkflowData({
      ...emptyWorkflowSetupData,
      ...(initialWorkflowData ?? {}),
      type: workflowType,
    });
  }, [
    isOpen,
    workflowType,
    initialWorkflowData,
    setCurrentStep,
    setWorkflowData,
  ]);

  return {
    workflowData,
    setWorkflowData,
  };
};

export const useConfigureWorkflowable = (
  workflowData: WorkflowInput,
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>
) => {
  const handleContinue = useCallback(() => {
    // Validate the form data
    if (workflowData.workflowable.type !== workflowData.type) return;
    // Continue to the next step
    setCurrentStep(2);
  }, [workflowData, setCurrentStep]);

  return {
    handleContinue,
  };
};

export const useConfigureWorkflow = (
  workflowData: WorkflowInput,
  closeModal: () => void
) => {
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspace();
  const [processing, setProcessing] = useState(false);

  const initialWorkflowSchedule = useRef(workflowData.schedule);
  const creatingWorkflow = useRef(false);

  /**
   * Create the workflow with the provided data using the Irmin API
   */
  const handleCreate = useCallback(async () => {
    // Prevent multiple requests
    if (creatingWorkflow.current) return;
    try {
      creatingWorkflow.current = true;
      setProcessing(true);
      // Create the workflow
      const res = await createWorkflow({
        workspace: workspaceSlug,
        ...workflowData,
      });
      // Show the result to the user
      irminAlert('success', res?.message ?? 'Workflow created successfully');
      closeModal();
    } catch (error) {
      console.error('Failed to create workflow', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to create the workflow'
      );
    } finally {
      setProcessing(false);
      creatingWorkflow.current = false;
    }
  }, [irminAlert, workspaceSlug, closeModal, workflowData]);

  return {
    processing,
    initialWorkflowSchedule,
    handleCreate,
  };
};
