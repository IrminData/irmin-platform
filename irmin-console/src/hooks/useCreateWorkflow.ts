import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createActionWorkflow,
  createExportWorkflow,
  createImportWorkflow,
} from '@/lib/actions/workflows';

import { usePopup } from '@/context/PopupContext';

import { WorkflowableType } from '@/types/core/Workflow';
import { WorkflowSetup } from '@/types/internal/WorkflowSetup';

/**
 * Empty workflow setup data
 */
const initialWorkflowData: WorkflowSetup = {
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
  connection: null,
  path: '/',
  branch: 'main',
  repository: null,
  recursive: false,
  executable: '',
  live: false,
  stages: [],
};

export const useWorkflowCreation = (
  isOpen: boolean,
  workflowType: WorkflowableType,
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>
) => {
  const [workflowData, setWorkflowData] = useState<WorkflowSetup>({
    ...initialWorkflowData,
    type: workflowType,
  });

  useEffect(() => {
    setCurrentStep(1);
    setWorkflowData({
      ...initialWorkflowData,
      type: workflowType,
    });
  }, [isOpen, workflowType, setCurrentStep, setWorkflowData]);

  return {
    workflowData,
    setWorkflowData,
  };
};

export const useConfigureWorkflowable = (
  workflowData: WorkflowSetup,
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>
) => {
  const handleContinue = useCallback(() => {
    // Validate the form data
    if (workflowData.type === 'action') {
      if (!workflowData.executable) return;
      if (!workflowData.repository) return;
      if (!workflowData.branch) return;
      if (!workflowData.path) return;
    }
    if (workflowData.type === 'import') {
      if (!workflowData.connection) return;
      if (!workflowData.repository) return;
      if (!workflowData.branch) return;
      if (!workflowData.path) return;
    }
    if (workflowData.type === 'export') {
      if (!workflowData.connection) return;
      if (!workflowData.repository) return;
      if (!workflowData.branch) return;
      if (!workflowData.path) return;
    }
    // Continue to the next step
    setCurrentStep(2);
  }, [workflowData, setCurrentStep]);

  return {
    handleContinue,
  };
};

export const useConfigureWorkflow = (
  workflowData: WorkflowSetup,
  closeModal: () => void
) => {
  const { irminAlert } = usePopup();
  const [processing, setProcessing] = useState(false);

  const initialWorkflowSchedule = useRef(workflowData.schedule);
  const creatingWorkflow = useRef(false);

  const createWorkflow = useCallback(async () => {
    if (workflowData.type === 'action') {
      // Create the action workflow
      const response = await createActionWorkflow({
        // Workflow data
        name: workflowData.name,
        description: workflowData.description,
        documentation: workflowData.documentation,
        schedule: workflowData.schedule,
        // Workflowable data
        executable: workflowData.executable,
        repository: workflowData.repository?.slug ?? '',
        branch: workflowData.branch,
        path: workflowData.path,
      });
      return response;
    }
    if (workflowData.type === 'import') {
      const response = await createImportWorkflow({
        // Workflow data
        name: workflowData.name,
        description: workflowData.description,
        documentation: workflowData.documentation,
        schedule: workflowData.schedule,
        // Workflowable data
        repository: workflowData.repository?.slug ?? '',
        branch: workflowData.branch,
        path: workflowData.path,
        connection: workflowData.connection?.id ?? '',
      });
      return response;
    }
    if (workflowData.type === 'export') {
      const response = await createExportWorkflow({
        // Workflow data
        name: workflowData.name,
        description: workflowData.description,
        documentation: workflowData.documentation,
        schedule: workflowData.schedule,
        // Workflowable data
        repository: workflowData.repository?.slug ?? '',
        branch: workflowData.branch,
        path: workflowData.path,
        connection: workflowData.connection?.id ?? '',
        recursive: workflowData.recursive,
      });
      return response;
    }
  }, [workflowData]);

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
      const res = await createWorkflow();
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
  }, [irminAlert, createWorkflow, closeModal]);

  return {
    processing,
    initialWorkflowSchedule,
    handleCreate,
  };
};
