'use client';

import { memo } from 'react';

import { CreateWorkflowProvider } from '@/context/CreateWorkflowContext';

import type { WorkflowRequest } from '@/types/internal/WorkflowInput';

import ConfigureFieldMappings from './ConfigureFieldMappings';
import ConfigureWorkflow from './ConfigureWorkflow';
import ConfigureWorkflowable from './ConfigureWorkflowable';

/**
 * Renders the content of the create workflow modal based on the current step
 */
const CreateWorkflowModalContent = memo(
  ({
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
    initialWorkflowData: WorkflowRequest;
  }) => {
    if (!isOpen) return null;

    const hasFieldMappings =
      initialWorkflowData.type === 'import' ||
      initialWorkflowData.type === 'export';

    return (
      <CreateWorkflowProvider
        workflowType={initialWorkflowData.type}
        initialWorkflowData={initialWorkflowData}
      >
        {currentStep === 1 && (
          <ConfigureWorkflowable setCurrentStep={setCurrentStep} />
        )}
        {currentStep === 2 && hasFieldMappings && (
          <ConfigureFieldMappings
            setCurrentStep={setCurrentStep}
            closeModal={closeModal}
          />
        )}
        {currentStep === (hasFieldMappings ? 3 : 2) && (
          <ConfigureWorkflow
            setCurrentStep={setCurrentStep}
            closeModal={closeModal}
          />
        )}
      </CreateWorkflowProvider>
    );
  }
);

CreateWorkflowModalContent.displayName = 'CreateWorkflowModalContent';

export { CreateWorkflowModalContent };
