'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Connection } from '@/types/core/Connection';

import ConfigureConnectionStep from './steps/ConfigureConnectionStep';
import DefineDetailsStep from './steps/DefineDetailsStep';
import DefineSettingsStep from './steps/DefineSettingsStep';
import SelectConnectorStep from './steps/SelectConnectorStep';
import type { ConnectionWizardData } from './types';

/**
 * Initial connection wizard data state
 */
const initialWizardData: ConnectionWizardData = {
  name: '',
  description: '',
  connector: undefined,
  connectionDetailsFields: undefined,
  connectionSettingsFields: undefined,
  connectionDetails: undefined,
  connectionSettings: undefined,
  tags: [],
};

/**
 * Main content component for the Connection Wizard
 *
 * Manages the wizard state and renders the appropriate step component
 * Can be used in standalone mode (in a modal) or embedded mode (inside another wizard)
 */
export default function ConnectionWizard({
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
  onComplete?: (connection: Connection) => void;
  onCancel?: () => void;
}) {
  const [wizardData, setWizardData] =
    useState<ConnectionWizardData>(initialWizardData);
  const prevStepRef = useRef<number>(currentStep);

  // Reset wizard data when returning to step 1 from another step
  useEffect(() => {
    if (currentStep === 1 && prevStepRef.current !== 1) {
      queueMicrotask(() => {
        setWizardData(initialWizardData);
      });
    }
    prevStepRef.current = currentStep;
  }, [currentStep]);

  // Function to go to the next step
  const goNext = useCallback(() => {
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, setCurrentStep]);

  // Function to go back to the previous step
  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep, setCurrentStep]);

  // Function to go to a specific step
  const goToStep = useCallback(
    (step: number) => {
      if (step >= 1 && step <= 4) {
        setCurrentStep(step);
      }
    },
    [setCurrentStep]
  );

  // Function to update wizard data
  const updateWizardData = useCallback(
    (updates: Partial<ConnectionWizardData>) => {
      setWizardData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  return (
    <>
      {currentStep === 1 && (
        <SelectConnectorStep
          updateWizardData={updateWizardData}
          goNext={goNext}
          onCancel={embedded ? onCancel : undefined}
        />
      )}
      {currentStep === 2 && (
        <DefineDetailsStep
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          goBack={goBack}
          goNext={goNext}
          goToStep={goToStep}
        />
      )}
      {currentStep === 3 && (
        <DefineSettingsStep
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          goBack={goBack}
          goNext={goNext}
        />
      )}
      {currentStep === 4 && (
        <ConfigureConnectionStep
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          goBack={goBack}
          goToStep={goToStep}
          closeModal={closeModal}
          embedded={embedded}
          onComplete={onComplete}
        />
      )}
    </>
  );
}
