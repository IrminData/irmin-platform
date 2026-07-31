'use client';

import { useState } from 'react';

import SideModal from '@/components/ui/popup/SideModal';

import { useLocale } from '@/context/LocaleContext';

import { useResourceAllowed } from '@/hooks/utils';

import { DataExportWizard } from './DataExportWizard';

/**
 * Data export wizard modal component that displays the data export wizard
 */
export default function DataExportWizardModal({
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
        dict.wizard.selectDestination,
        dict.wizard.selectRepository,
        dict.wizard.configure,
        dict.wizard.reviewAndCreate,
      ]}
      title={dict.wizard.setupDataExportWizard}
    >
      <DataExportWizard
        closeModal={closeModal}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
      />
    </SideModal>
  );
}
