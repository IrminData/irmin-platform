'use client';

import { useState } from 'react';

import { IoAdd } from 'react-icons/io5';

import Button from '@/components/common/button/Button';
import SideModal from '@/components/common/popup/SideModal';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

import CreateWorkflowModalContent from './CreateWorkflowModalContent';
import ImportWorkflowList from './ImportWorkflowList';

/**
 * UI component to list and manage Import Workflows in the workspace
 *
 * Uses {@link ImportWorkflowList} to display the list of Import Workflows
 * Uses {@link SideModal} and {@link CreateWorkflowModalContent} to provide UI for new Import Workflow creation
 *
 * @param props0 - The props
 * @param props0.sideModalOpen - Whether the side modal is open by default or not
 * @param props0.onModalOpen - Callback when the modal is opened
 * @param props0.onModalClose - Callback when the modal is closed
 */
export default function ImportWorkflowsSection({
  sideModalOpen = false,
  onModalOpen,
  onModalClose,
}: {
  sideModalOpen?: boolean;
  onModalOpen?: () => void;
  onModalClose?: () => void;
}) {
  const { dict } = useLocale();
  const {
    workspaceLoading,
    workflows: {
      imports: { imports, isLoading: workflowsLoading },
    },
  } = useWorkspace();

  const [isOpen, setIsOpen] = useState(sideModalOpen);
  const [currentStep, setCurrentStep] = useState(1);

  const closeModal = () => {
    if (onModalClose) {
      onModalClose();
    } else {
      setIsOpen(false);
    }
  };
  const openModal = () => {
    if (onModalOpen) {
      onModalOpen();
    } else {
      setIsOpen(true);
      setCurrentStep(1);
    }
  };

  const loading = workspaceLoading || workflowsLoading;

  return (
    <div className='container relative mx-auto max-w-6xl py-8'>
      <div className='my-4 flex flex-row items-center justify-between gap-4 px-4'>
        <h2 className='font-display text-2xl font-bold text-opacity-80 sm:text-3xl lg:text-5xl'>
          {dict.workflow.importWorkflows}
        </h2>
        <Button
          colorScheme='primary'
          variant='solid'
          onClick={() => openModal()}
          icon={<IoAdd size={25} />}
        >
          {dict.workflow.create.createNewImportWorkflow}
        </Button>
      </div>
      <SideModal
        isOpen={isOpen}
        closeModal={closeModal}
        currentStep={currentStep}
        steps={[
          dict.workflow.create.configureImport,
          dict.workflow.create.configureWorkflow,
        ]}
        title={dict.workflow.create.createNewImportWorkflow}
      >
        <CreateWorkflowModalContent
          isOpen={isOpen}
          closeModal={closeModal}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          workflowType={'import'}
        />
      </SideModal>
      <ImportWorkflowList loading={loading} importWorkflows={imports} />
    </div>
  );
}
