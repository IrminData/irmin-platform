'use client';

import React from 'react';

import { useWorkflowCreation } from '@/hooks/useCreateWorkflow';

import { Connection } from '@/types/core/Connection';
import { EditorItem } from '@/types/core/EditorItems';
import { Repository } from '@/types/core/Repository';
import { WorkflowInput } from '@/types/internal/WorkflowInput';

import ConfigureWorkflow from './ConfigureWorkflow';
import ConfigureWorkflowable from './ConfigureWorkflowable';

/**
 * Workflow setup view
 *
 * @param props - Component properties
 * @param props.editorItems - List of editor items
 * @param props.repositories - List of repositories
 * @param props.connections - List of connections
 * @param props.isOpen - If the modal is open
 * @param props.closeModal - Function to close the modal
 * @param props.currentStep - Current step in the workflow creation
 * @param props.setCurrentStep - Function to set the current step
 * @param props.workflowType - Workflow type to create
 * @param props.initialWorkflowData - (optional) Initial workflow data
 */
const CreateWorkflowModalContent = ({
  editorItems,
  repositories,
  connections,
  isOpen,
  closeModal,
  currentStep,
  setCurrentStep,
  initialWorkflowData,
}: {
  editorItems: EditorItem[];
  repositories: Repository[];
  connections: Connection[];
  isOpen: boolean;
  closeModal: () => void;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  initialWorkflowData?: WorkflowInput;
}) => {
  const { workflowData, setWorkflowData } = useWorkflowCreation(
    isOpen,
    initialWorkflowData,
    setCurrentStep
  );

  return (
    <>
      {currentStep === 1 && (
        <ConfigureWorkflowable
          editorItems={editorItems}
          repositories={repositories}
          connections={connections}
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

export default React.memo(CreateWorkflowModalContent);
