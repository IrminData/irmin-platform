'use client';

import { useState } from 'react';

import SideModal from '@/components/ui/popup/SideModal';

import { useLocale } from '@/context/LocaleContext';

import { useResourceAllowed } from '@/hooks/utils';

import { RepositoryWizard } from './RepositoryWizard';

/**
 * Repository wizard modal component that displays the repository wizard
 */
export default function RepositoryWizardModal({
  isOpen = false,
  closeModal,
}: {
  isOpen?: boolean;
  closeModal: () => void;
}) {
  const { dict } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();

  const [currentStep, setCurrentStep] = useState(1);

  if (!isResourceAllowed('repository', 'create')) {
    return null;
  }

  return (
    <SideModal
      isOpen={isOpen}
      closeModal={closeModal}
      currentStep={currentStep}
      steps={[dict.repository.createNewRepository, dict.common.view]}
      title={dict.repository.createNewRepository}
    >
      <RepositoryWizard
        closeModal={closeModal}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
      />
    </SideModal>
  );
}
