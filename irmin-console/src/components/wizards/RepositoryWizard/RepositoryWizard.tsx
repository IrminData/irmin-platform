'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useState } from 'react';

import type { Repository } from '@/types/core/Repository';

import ConfigureRepositoryStep from './steps/ConfigureRepositoryStep';
import ReviewAndCreateStep from './steps/ReviewAndCreateStep';
import type { RepositoryWizardData } from './types';

/**
 * Initial repository wizard data state
 */
const initialWizardData: RepositoryWizardData = {
  name: '',
  description: '',
  default_branch: 'main',
};

/**
 * Main content component for the Repository Wizard
 *
 * Manages the wizard state and renders the appropriate step component
 * Can be used in standalone mode (in a modal) or embedded mode (inside another wizard)
 */
export default function RepositoryWizard({
  closeModal,
  currentStep,
  setCurrentStep,
  embedded = false,
  onComplete,
  onCancel,
}: {
  closeModal: () => void;
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  embedded?: boolean;
  onComplete?: (repository: Repository) => void;
  onCancel?: () => void;
}) {
  const [wizardData, setWizardData] =
    useState<RepositoryWizardData>(initialWizardData);

  // Function to go to the next step
  const goNext = useCallback(() => {
    if (currentStep < 2) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, setCurrentStep]);

  // Function to go back to the previous step
  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep, setCurrentStep]);

  // Function to update wizard data
  const updateWizardData = useCallback(
    (updates: Partial<RepositoryWizardData>) => {
      setWizardData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  return (
    <>
      {currentStep === 1 && (
        <ConfigureRepositoryStep
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          goNext={goNext}
          embedded={embedded}
          onComplete={onComplete}
          onCancel={onCancel}
        />
      )}
      {currentStep === 2 && (
        <ReviewAndCreateStep
          wizardData={wizardData}
          goBack={goBack}
          closeModal={closeModal}
        />
      )}
    </>
  );
}
