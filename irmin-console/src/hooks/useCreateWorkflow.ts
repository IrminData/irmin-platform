import { useCallback, useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/WorkspaceContext';

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
  workflowable: {
    type: 'action',
    executable: '',
  },
};

export const useWorkflowCreation = (
  isOpen: boolean,
  initialWorkflowData: WorkflowInput | undefined,
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>
) => {
  const [workflowData, setWorkflowData] = useState<WorkflowInput>({
    ...emptyWorkflowSetupData,
    ...(initialWorkflowData ?? {}),
    workflowable: {
      ...emptyWorkflowSetupData.workflowable,
      ...(initialWorkflowData?.workflowable ?? {}),
    },
  });

  const searchParams = useSearchParams();
  const executable = searchParams.get('executable');

  useEffect(() => {
    setCurrentStep(1);
    const newWorkflowInputData: WorkflowInput = {
      ...emptyWorkflowSetupData,
      ...(initialWorkflowData ?? {}),
      workflowable: {
        ...emptyWorkflowSetupData.workflowable,
        ...(initialWorkflowData?.workflowable ?? {}),
      },
    };
    // Set initial values based on query params and the workflow type
    if (executable && newWorkflowInputData.workflowable.type === 'action') {
      newWorkflowInputData.workflowable.executable = executable;
    }
    // Set the workflow data
    setWorkflowData(newWorkflowInputData);
  }, [
    isOpen,
    initialWorkflowData,
    executable,
    setCurrentStep,
    setWorkflowData,
  ]);

  return {
    workflowData,
    setWorkflowData,
  };
};

export const useConfigureWorkflow = (
  workflowData: WorkflowInput,
  closeModal: () => void
) => {
  const { getToken } = useIAM();
  const { locale } = useLocale();
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
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const res = await irminCore.workflowService.createWorkflow({
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
  }, [irminAlert, workspaceSlug, closeModal, workflowData, getToken, locale]);

  return {
    processing,
    initialWorkflowSchedule,
    handleCreate,
  };
};
