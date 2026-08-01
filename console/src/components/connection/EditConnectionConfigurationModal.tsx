'use client';

import { useCallback, useMemo, useState } from 'react';

import SideModal from '@/components/ui/popup/SideModal';
import { ConnectionWizard } from '@/components/wizards/ConnectionWizard';
import type { ConnectionConfigurationSubmission } from '@/components/wizards/ConnectionWizard/types';

import { useConnectionContext } from '@/context/ConnectionContext';
import { useLocale } from '@/context/LocaleContext';

type EditConnectionConfigurationModalProps = {
  isOpen: boolean;
  closeModal: () => void;
};

export default function EditConnectionConfigurationModal({
  isOpen,
  closeModal,
}: EditConnectionConfigurationModalProps) {
  const { dict } = useLocale();
  const { connectionQuery, updateConnectionConfigurationMutation } =
    useConnectionContext();

  const [currentStep, setCurrentStep] = useState(1);

  const connection = connectionQuery.data?.data;

  const handleClose = useCallback(() => {
    setCurrentStep(1);
    closeModal();
  }, [closeModal]);

  const handleSubmitConfiguration = useCallback(
    (payload: ConnectionConfigurationSubmission) =>
      updateConnectionConfigurationMutation.mutateAsync({
        details: payload.details,
        settings: payload.settings,
      }),
    [updateConnectionConfigurationMutation]
  );

  const steps = useMemo(
    () => [
      dict.connections.create.establishConnection,
      dict.connections.create.configureSettings,
      dict.connections.create.configureConnection,
    ],
    [
      dict.connections.create.configureConnection,
      dict.connections.create.configureSettings,
      dict.connections.create.establishConnection,
    ]
  );

  if (!connection) {
    return null;
  }

  return (
    <SideModal
      isOpen={isOpen}
      closeModal={handleClose}
      currentStep={currentStep}
      steps={steps}
      title={dict.connections.config.editConfiguration}
    >
      {isOpen && (
        <ConnectionWizard
          mode='edit'
          initialConnection={connection}
          closeModal={handleClose}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          onSubmitConfiguration={handleSubmitConfiguration}
        />
      )}
    </SideModal>
  );
}
