'use client';

import { useCallback, useState } from 'react';

import SideModal from '@/components/ui/popup/SideModal';

import { useLocale } from '@/context/LocaleContext';

import { useResourceAllowed } from '@/hooks/utils';

import { ConnectionWizard } from './ConnectionWizard';

/**
 * Connection wizard modal component that displays the connection wizard
 */
export default function ConnectionWizardModal({
  isOpen = false,
  closeModal,
}: {
  isOpen?: boolean;
  closeModal: () => void;
}) {
  const { dict } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();

  const [currentStep, setCurrentStep] = useState(1);

  const handleClose = useCallback(() => {
    setCurrentStep(1);
    closeModal();
  }, [closeModal]);

  if (!isResourceAllowed('connection', 'create')) {
    return null;
  }

  return (
    <SideModal
      isOpen={isOpen}
      closeModal={handleClose}
      currentStep={currentStep}
      steps={[
        dict.connections.create.selectConnector,
        dict.connections.create.establishConnection,
        dict.connections.create.configureSettings,
        dict.connections.create.configureConnection,
      ]}
      title={dict.connections.create.createConnection}
    >
      {isOpen && (
        <ConnectionWizard
          closeModal={handleClose}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      )}
    </SideModal>
  );
}
