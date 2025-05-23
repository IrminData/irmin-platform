import React, { createContext, useCallback, useContext } from 'react';
import { useEffect, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { useWorkflows } from '@/hooks/useWorkflows';

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
    input: [],
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
  const { createWorkflowMutation } = useWorkflows();

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

  /**
   * Create the workflow with the provided data using the Irmin API
   *
   * @returns {Promise<boolean>} - Returns true if the workflow was created successfully, false otherwise
   */
  const handleCreateWorkflow = useCallback(async () => {
    try {
      await createWorkflowMutation.mutateAsync(workflowData);
      return true;
    } catch (error) {
      console.error('Failed to create workflow', error);
      return false;
    }
  }, [createWorkflowMutation, workflowData]);

  return (
    <CreateWorkflowContext.Provider
      value={{
        workflowData,
        setWorkflowData,
        processingCreation: createWorkflowMutation.isPending,
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
