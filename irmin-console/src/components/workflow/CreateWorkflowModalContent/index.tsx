import { getConnections } from '@/lib/actions/connections';
import { getRepositories } from '@/lib/actions/repositories';

import { WorkflowableType } from '@/types/core/Workflow';

import CreateWorkflowWrapper from './CreateWorkflowWrapper';

/**
 * Workflow creation modal content
 *
 * @param props - Component properties
 * @param props.isOpen - If the modal is open
 * @param props.workflowType - Workflow type to create
 * @param props.closeModal - Function to close the modal
 * @param props.currentStep - Current step in the workflow creation
 * @param props.setCurrentStep - Function to set the current step
 */
const CreateWorkflowModalContent = async ({
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
  const [connections, repositories] = await Promise.all([
    getConnections(),
    getRepositories(),
  ]);
  return (
    <CreateWorkflowWrapper
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
