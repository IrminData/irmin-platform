import { Connection } from '@/types/core/Connection';
import { EditorItems } from '@/types/core/EditorItems';
import { Repository } from '@/types/core/Repository';
import { WorkflowableType } from '@/types/core/Workflow';

import CreateWorkflowWrapper from './CreateWorkflowWrapper';

/**
 * Workflow creation modal content
 *
 * @param props - Component properties
 * @param props.connections - List of connections
 * @param props.repositories - List of repositories
 * @param props.isOpen - If the modal is open
 * @param props.workflowType - Workflow type to create
 * @param props.closeModal - Function to close the modal
 * @param props.currentStep - Current step in the workflow creation
 * @param props.setCurrentStep - Function to set the current step
 */
const CreateWorkflowModalContent = ({
  editorItems,
  connections,
  repositories,
  isOpen,
  workflowType,
  closeModal,
  currentStep,
  setCurrentStep,
}: {
  editorItems: EditorItems;
  connections: Connection[];
  repositories: Repository[];
  isOpen: boolean;
  workflowType: WorkflowableType;
  closeModal: () => void;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) => {
  return (
    <CreateWorkflowWrapper
      editorItems={editorItems}
      repositories={repositories}
      connections={connections}
      isOpen={isOpen}
      workflowType={workflowType}
      closeModal={closeModal}
      currentStep={currentStep}
      setCurrentStep={setCurrentStep}
    />
  );
};

export default CreateWorkflowModalContent;
