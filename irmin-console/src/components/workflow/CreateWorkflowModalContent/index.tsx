'use client';

import { useSearchParams } from 'next/navigation';

import {
  emptyWorkflowSetupData,
  useWorkflowCreation,
} from '@/hooks/useCreateWorkflow';

import { Connection } from '@/types/core/Connection';
import { EditorItems } from '@/types/core/EditorItems';
import { Repository } from '@/types/core/Repository';
import { WorkflowableType } from '@/types/core/Workflow';
import { WorkflowSetup } from '@/types/internal/WorkflowInput';

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
  workflowType,
  initialWorkflowData,
}: {
  editorItems: EditorItems;
  repositories: Repository[];
  connections: Connection[];
  isOpen: boolean;
  closeModal: () => void;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  workflowType: WorkflowableType;
  initialWorkflowData?: WorkflowSetup;
}) => {
  const searchParams = useSearchParams();
  const executable = searchParams.get('executable');

  const { workflowData, setWorkflowData } = useWorkflowCreation(
    isOpen,
    workflowType,
    {
      ...emptyWorkflowSetupData,
      ...(initialWorkflowData ?? {}),
      executable:
        executable ??
        initialWorkflowData?.executable ??
        emptyWorkflowSetupData.executable,
    },
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

export default CreateWorkflowModalContent;
