import React, { createContext, useCallback, useContext, useRef } from 'react';
import { useEffect, useState } from 'react';

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

/**
 * Interface for the create workflow context value.
 */
interface CreateWorkflowContextValue {
  workflowData: WorkflowInput;
  setWorkflowData: React.Dispatch<React.SetStateAction<WorkflowInput>>;
  processingCreation: boolean;
  createWorkflow: () => Promise<boolean>;
}

// Create context with an undefined default value.
const CreateWorkflowContext = createContext<
  CreateWorkflowContextValue | undefined
>(undefined);

export const CreateWorkflowProvider: React.FC<{
  initialWorkflowData: WorkflowInput | undefined;
  children: React.ReactNode;
}> = ({ initialWorkflowData, children }) => {
  const { getToken } = useIAM();
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const { workspaceSlug } = useWorkspace();

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
  }, [initialWorkflowData, executable]);

  const [processingCreation, setProcessingCreation] = useState(false);
  const creatingWorkflow = useRef(false);

  /**
   * Create the workflow with the provided data using the Irmin API
   *
   * @returns {Promise<boolean>} - Returns true if the workflow was created successfully, false otherwise
   */
  const handleCreateWorkflow = useCallback(async () => {
    // Prevent multiple requests
    if (creatingWorkflow.current) return false;
    try {
      creatingWorkflow.current = true;
      setProcessingCreation(true);
      // Create the workflow
      const token = await getToken();
      const irminCore = new IrminCore(locale, token);
      const res = await irminCore.workflowService.createWorkflow({
        workspace: workspaceSlug,
        ...workflowData,
      });
      // Show the result to the user
      irminAlert('success', res?.message ?? 'Workflow created successfully');
      return true;
    } catch (error) {
      console.error('Failed to create workflow', error);
      irminAlert(
        'error',
        (error as Error)?.message ?? 'Failed to create the workflow'
      );
    } finally {
      setProcessingCreation(false);
      creatingWorkflow.current = false;
    }
    return false;
  }, [irminAlert, workspaceSlug, workflowData, getToken, locale]);

  return (
    <CreateWorkflowContext.Provider
      value={{
        workflowData,
        setWorkflowData,
        processingCreation,
        createWorkflow: handleCreateWorkflow,
      }}
    >
      {children}
    </CreateWorkflowContext.Provider>
  );
};

/**
 * Hook to access the create workflow context.
 */
export const useCreateWorkflow = (): CreateWorkflowContextValue => {
  const context = useContext(CreateWorkflowContext);
  if (!context) {
    throw new Error(
      'useCreateWorkflow must be used within a CreateWorkflowProvider'
    );
  }
  return context;
};
