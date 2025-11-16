'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import ConfigureExportStep from './steps/ConfigureExportStep';
import ReviewAndCreateStep from './steps/ReviewAndCreateStep';
import SelectDestinationStep from './steps/SelectDestinationStep';
import SelectRepositoryStep from './steps/SelectRepositoryStep';
import type { DataExportWizardData } from './types';

/**
 * Initial data export wizard data state
 */
const initialWizardData: DataExportWizardData = {
  connection: null,
  createNewConnection: false,

  repository: null,

  workflowData: {
    name: '',
    description: '',
    documentation: '',
    schedule: undefined,
    export_from_repository_paths: [],
    repository_branch: 'main',
    export_to_connection_path: '',
    field_mappings: [],
  },
};

/**
 * Main content component for the Data Export Wizard
 *
 * Manages the wizard state and renders the appropriate step component
 */
export default function DataExportWizard({
  closeModal,
  currentStep,
  setCurrentStep,
}: {
  closeModal: () => void;
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
}) {
  const [wizardData, setWizardData] =
    useState<DataExportWizardData>(initialWizardData);
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

  // Function to update wizard data
  const updateWizardData = useCallback(
    (updates: Partial<DataExportWizardData>) => {
      setWizardData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  return (
    <>
      {currentStep === 1 && (
        <SelectDestinationStep
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          goNext={goNext}
        />
      )}
      {currentStep === 2 && (
        <SelectRepositoryStep
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          goBack={goBack}
          goNext={goNext}
        />
      )}
      {currentStep === 3 && (
        <ConfigureExportStep
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          goBack={goBack}
          goNext={goNext}
        />
      )}
      {currentStep === 4 && (
        <ReviewAndCreateStep
          wizardData={wizardData}
          goBack={goBack}
          closeModal={closeModal}
        />
      )}
    </>
  );
}
