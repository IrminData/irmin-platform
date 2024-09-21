'use client';

import { useEffect, useState } from 'react';

import { Connection } from '@/types/core/Connection';
import { Repository } from '@/types/core/Repository';
import { WorkflowableType } from '@/types/core/Workflow';

import ConfigureWorkflow from './ConfigureWorkflow';
import ConfigureWorkflowable from './ConfigureWorkflowable';

/**
 * Workflow setup object
 *
 * Please note, that different workflow will have different properties
 * required to be set.
 *
 * @typeParam name - Workflow name
 * @typeParam description - Workflow description
 * @typeParam cron - Sync interval as a cron expression
 * @typeParam type - Workflow type, eg. import, action, export
 * @typeParam connection - Connection to use in the workflow
 * @typeParam path - Path to use in the workflow
 * @typeParam repository - Repository to use in the workflow
 * @typeParam recursive - If the workflow should be recursive
 */
export interface WorkflowSetup {
  name: string;
  description: string;
  cron: string;
  type: WorkflowableType;
  connection: Connection | null;
  path: string;
  repository: Repository | null;
  recursive: boolean;
}

/**
 * Empty workflow setup data
 */
export const initialWorkflowData: WorkflowSetup = {
  name: '',
  description: '',
  cron: '1 0 * * *',
  type: 'action',
  connection: null,
  path: '/',
  repository: null,
  recursive: false,
};

/**
 * Workflow setup view
 *
 * @param props - Component properties
 * @param props.isOpen - If the modal is open
 * @param props.workflowType - Workflow type to create
 * @param props.closeModal - Function to close the modal
 * @param props.currentStep - Current step in the workflow creation
 * @param props.setCurrentStep - Function to set the current step
 */
const CreateWorkflowModalContent = ({
  isOpen,
  workflowType,
  closeModal,
  currentStep,
  setCurrentStep,
}: {
  isOpen: boolean;
  workflowType: WorkflowableType;
  closeModal: () => void;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const [workflowData, setWorkflowData] = useState<WorkflowSetup>({
    ...initialWorkflowData,
    type: workflowType,
  });

  // Reset connection data when modal is closed
  useEffect(() => {
    setCurrentStep(1);
    setWorkflowData({
      ...initialWorkflowData,
      type: workflowType,
    });
  }, [isOpen, workflowType, setCurrentStep, setWorkflowData]);

  return (
    <>
      {currentStep === 1 && (
        <ConfigureWorkflowable
          workflowData={workflowData}
          setWorkflowData={setWorkflowData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 2 && (
        <ConfigureWorkflow
          workflowData={workflowData}
          setWorkflowData={setWorkflowData}
          setCurrentStep={setCurrentStep}
          closeModal={closeModal}
        />
      )}
    </>
  );
};

export default CreateWorkflowModalContent;
