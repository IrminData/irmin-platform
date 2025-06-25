import React, { createContext, useCallback, useContext } from 'react';
import { useEffect, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { useWorkflows } from '@/hooks/useWorkflows';

import {
  Action,
  Export,
  Import,
  Pipeline,
  WorkflowableType,
} from '@/types/core/Workflow';
import { WorkflowRequest } from '@/types/internal/WorkflowInput';

/**
 * Empty workflow setup data
 */
const emptyWorkflowSetupData: WorkflowRequest = {
  name: '',
  description: '',
  documentation: '',
  type: 'action',
  schedule: {
    triggers: [],
    max_retries: 3,
    max_runtime: 15,
    min_interval: 120,
  },
};

const emptyImportWorkflowable: Import = {
  type: 'import',
  connection_id: '',
  connection_path: '',
  repository: '',
  repository_path: '',
  repository_branch: '',
  field_mappings: [],
};

const emptyExportWorkflowable: Export = {
  type: 'export',
  connection_id: '',
  connection_path: '',
  repository: '',
  repository_path: '',
  repository_branch: '',
  field_mappings: [],
};

const emptyActionWorkflowable: Action = {
  type: 'action',
  executable: '',
  input: [],
};

const emptyPipelineWorkflowable: Pipeline = {
  type: 'pipeline',
  live: false,
  stages: [],
};

/**
 * Interface for the create workflow context value.
 */
interface CreateWorkflowContextValue {
  workflowData: WorkflowRequest;
  setWorkflowData: React.Dispatch<React.SetStateAction<WorkflowRequest>>;
  processingCreation: boolean;
  createWorkflow: () => Promise<boolean>;
}

// Create context with an undefined default value.
const CreateWorkflowContext = createContext<
  CreateWorkflowContextValue | undefined
>(undefined);

export const CreateWorkflowProvider: React.FC<{
  workflowType: WorkflowableType;
  initialWorkflowData: WorkflowRequest | undefined;
  children: React.ReactNode;
}> = ({ workflowType, initialWorkflowData, children }) => {
  const { createWorkflowMutation } = useWorkflows();

  const [workflowData, setWorkflowData] = useState<WorkflowRequest>({
    ...emptyWorkflowSetupData,
    ...(initialWorkflowData ?? {}),
    workflowable: {
      ...(workflowType === 'import'
        ? emptyImportWorkflowable
        : workflowType === 'export'
          ? emptyExportWorkflowable
          : workflowType === 'action'
            ? emptyActionWorkflowable
            : emptyPipelineWorkflowable),
      ...(initialWorkflowData?.workflowable ?? {}),
    },
  });

  const searchParams = useSearchParams();
  const executable = searchParams.get('executable');

  useEffect(() => {
    const newWorkflowInputData: WorkflowRequest = {
      ...emptyWorkflowSetupData,
      ...(initialWorkflowData ?? {}),
      workflowable: {
        ...(workflowType === 'import'
          ? emptyImportWorkflowable
          : workflowType === 'export'
            ? emptyExportWorkflowable
            : workflowType === 'action'
              ? emptyActionWorkflowable
              : emptyPipelineWorkflowable),
        ...(initialWorkflowData?.workflowable ?? {}),
      },
    };
    // Set initial values based on query params and the workflow type
    if (
      executable &&
      newWorkflowInputData.workflowable &&
      newWorkflowInputData.workflowable.type === 'action'
    ) {
      const actionWorkflowable = newWorkflowInputData.workflowable as Action;
      actionWorkflowable.executable = executable;
    }
    // Set the workflow data
    setWorkflowData(newWorkflowInputData);
  }, [initialWorkflowData, executable, workflowType]);

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
