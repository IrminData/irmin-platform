'use client';

import { useWorkflowCreation } from '@/hooks/useCreateWorkflow';

import { Connection } from '@/types/core/Connection';
import { EditorItems } from '@/types/core/EditorItems';
import { Repository } from '@/types/core/Repository';
import { WorkflowableType } from '@/types/core/Workflow';

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
 * @param props.workflowType - Workflow type to create
 * @param props.closeModal - Function to close the modal
 * @param props.currentStep - Current step in the workflow creation
 * @param props.setCurrentStep - Function to set the current step
 */
const CreateWorkflowWrapper = ({
  editorItems,
  repositories,
  connections,
  isOpen,
  workflowType,
  closeModal,
  currentStep,
  setCurrentStep,
}: {
  editorItems: EditorItems;
  repositories: Repository[];
  connections: Connection[];
  isOpen: boolean;
  workflowType: WorkflowableType;
  closeModal: () => void;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const { workflowData, setWorkflowData } = useWorkflowCreation(
    isOpen,
    workflowType,
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

export default CreateWorkflowWrapper;
