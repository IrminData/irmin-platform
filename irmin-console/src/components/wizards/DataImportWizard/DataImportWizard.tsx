'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import ConfigureFieldMappingsStep from './steps/ConfigureFieldMappingsStep';
import ConfigureImportStep from './steps/ConfigureImportStep';
import ConnectDataSourceStep from './steps/ConnectDataSourceStep';
import ReviewAndCreateStep from './steps/ReviewAndCreateStep';
import SetupRepositoryStep from './steps/SetupRepositoryStep';
import type { DataImportWizardData } from './types';

/**
 * Initial data import wizard data state
 */
const initialWizardData: DataImportWizardData = {
  connection: null,
  createNewConnection: false,
  connectionData: {
    name: '',
    description: '',
    connector: undefined,
    connectionDetailsFields: undefined,
    connectionSettingsFields: undefined,
    connectionDetails: undefined,
    connectionSettings: undefined,
  },

  repository: null,
  createNewRepository: false,
  repositoryData: {
    name: '',
    description: '',
    default_branch: 'main',
  },

  workflowData: {
    name: '',
    description: '',
    documentation: '',
    schedule: undefined,
    import_from_connection_paths: ['/'],
    repository_branch: 'main',
    import_to_repository_path: '/',
    field_mappings: [],
    sync_mode: 'auto',
  },
};

/**
 * Main content component for the Data Import Wizard
 *
 * Manages the wizard state and renders the appropriate step component
 */
export default function DataImportWizard({
  closeModal,
  currentStep,
  setCurrentStep,
}: {
  closeModal: () => void;
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
}) {
  const [wizardData, setWizardData] =
    useState<DataImportWizardData>(initialWizardData);
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
    if (currentStep < 5) {
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
    (updates: Partial<DataImportWizardData>) => {
      setWizardData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  return (
    <>
      {currentStep === 1 && (
        <ConnectDataSourceStep
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          goNext={goNext}
        />
      )}
      {currentStep === 2 && (
        <SetupRepositoryStep
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          goBack={goBack}
          goNext={goNext}
        />
      )}
      {currentStep === 3 && (
        <ConfigureImportStep
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          goBack={goBack}
          goNext={goNext}
        />
      )}
      {currentStep === 4 && (
        <ConfigureFieldMappingsStep
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          goBack={goBack}
          goNext={goNext}
        />
      )}
      {currentStep === 5 && (
        <ReviewAndCreateStep
          wizardData={wizardData}
          goBack={goBack}
          closeModal={closeModal}
        />
      )}
    </>
  );
}
