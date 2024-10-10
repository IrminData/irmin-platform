'use client';

import { useEffect, useState } from 'react';

import { WorkflowableType } from '@/types/core/Workflow';
import { WorkflowSetup } from '@/types/internal/WorkflowSetup';

import ConfigureWorkflow from './ConfigureWorkflow';
import ConfigureWorkflowable from './ConfigureWorkflowable';

/**
 * Empty workflow setup data
 */
export const initialWorkflowData: WorkflowSetup = {
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
