'use client';

import { useState } from 'react';

import SideModal from '@/components/ui/popup/SideModal';

import { useLocale } from '@/context/LocaleContext';

import { useResourceAllowed } from '@/hooks/utils';

import { DataImportWizard } from './DataImportWizard';

/**
 * Data import wizard modal component that displays the data import wizard
 */
export default function DataImportWizardModal({
  isOpen = false,
  closeModal,
}: {
  isOpen?: boolean;
  closeModal: () => void;
}) {
  const { dict } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();

  const [currentStep, setCurrentStep] = useState(1);

  if (!isResourceAllowed('workflow', 'create')) {
    return null;
  }

  return (
    <SideModal
      isOpen={isOpen}
      closeModal={closeModal}
      currentStep={currentStep}
      steps={[
        dict.wizard.connectDataSource,
        dict.wizard.setupRepository,
        dict.wizard.configure,
        dict.workflow.create.configureFieldMappings,
        dict.wizard.reviewAndCreate,
      ]}
      title={dict.wizard.setupDataImportWizard}
    >
      <DataImportWizard
        closeModal={closeModal}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
      />
    </SideModal>
  );
}
