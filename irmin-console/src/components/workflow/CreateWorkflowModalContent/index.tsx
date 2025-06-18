'use client';

import { memo } from 'react';

import { CreateWorkflowProvider } from '@/context/CreateWorkflowContext';

import { WorkflowRequest } from '@/types/internal/WorkflowInput';

import ConfigureWorkflow from './ConfigureWorkflow';
import ConfigureWorkflowable from './ConfigureWorkflowable';

/**
 * Workflow setup view
 *
 * @param props - Component properties
 * @param props.isOpen - If the modal is open
 * @param props.closeModal - Function to close the modal
 * @param props.currentStep - Current step in the workflow creation
 * @param props.setCurrentStep - Function to set the current step
 * @param props.initialWorkflowData - (optional) Initial workflow data
 */
const CreateWorkflowModalContent = ({
  isOpen,
  closeModal,
  currentStep,
  setCurrentStep,
  initialWorkflowData,
}: {
  isOpen: boolean;
  closeModal: () => void;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  initialWorkflowData?: WorkflowRequest;
}) => {
  if (!isOpen) return null;

  return (
    <CreateWorkflowProvider initialWorkflowData={initialWorkflowData}>
      {currentStep === 1 && (
        <ConfigureWorkflowable setCurrentStep={setCurrentStep} />
      )}
      {currentStep === 2 && (
        <ConfigureWorkflow
          setCurrentStep={setCurrentStep}
          closeModal={closeModal}
        />
      )}
    </CreateWorkflowProvider>
  );
};

export default memo(CreateWorkflowModalContent);
