'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Connection } from '@/types/core/Connection';
import type { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

import ConfigureConnectionStep from './steps/ConfigureConnectionStep';
import DefineDetailsStep from './steps/DefineDetailsStep';
import DefineSettingsStep from './steps/DefineSettingsStep';
import SelectConnectorStep from './steps/SelectConnectorStep';
import type {
  ConnectionConfigurationSubmission,
  ConnectionWizardData,
  ConnectionWizardMode,
} from './types';
import { convertConnectionValuesToDynamicValues } from './utils';

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

const buildInitialWizardData = (
  connection?: Connection
): ConnectionWizardData => {
  if (!connection) {
    return initialWizardData;
  }

  return {
    name: connection.name,
    description: connection.description,
    connector: connection.connector,
    connectionDetailsFields: undefined,
    connectionSettingsFields: undefined,
    connectionDetails: convertConnectionValuesToDynamicValues(
      connection.details
    ),
    connectionSettings: convertConnectionValuesToDynamicValues(
      connection.settings
    ),
    tags: connection.tags ?? [],
  };
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
  mode = 'create',
  initialConnection,
  onSubmitConfiguration,
}: {
  closeModal: () => void;
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  embedded?: boolean;
  onComplete?: (connection: Connection) => void;
  onCancel?: () => void;
  mode?: ConnectionWizardMode;
  initialConnection?: Connection;
  onSubmitConfiguration?: (
    payload: ConnectionConfigurationSubmission
  ) => Promise<IrminAPIResponse<Connection>>;
}) {
  const wizardMode = mode ?? 'create';
  const totalSteps = wizardMode === 'edit' ? 3 : 4;

  const [wizardData, setWizardData] = useState<ConnectionWizardData>(() =>
    wizardMode === 'edit'
      ? buildInitialWizardData(initialConnection)
      : initialWizardData
  );
  const prevStepRef = useRef<number>(currentStep);

  // Reset wizard data when returning to step 1 from another step
  useEffect(() => {
    if (
      wizardMode === 'create' &&
      currentStep === 1 &&
      prevStepRef.current !== 1
    ) {
      queueMicrotask(() => {
        setWizardData(initialWizardData);
      });
    }
    prevStepRef.current = currentStep;
  }, [currentStep, wizardMode]);

  // Function to go to the next step
  const goNext = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, setCurrentStep, totalSteps]);

  // Function to go back to the previous step
  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep, setCurrentStep]);

  // Function to go to a specific step
  const goToStep = useCallback(
    (step: number) => {
      if (step >= 1 && step <= totalSteps) {
        setCurrentStep(step);
      }
    },
    [setCurrentStep, totalSteps]
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
      {wizardMode === 'create' && currentStep === 1 && (
        <SelectConnectorStep
          updateWizardData={updateWizardData}
          goNext={goNext}
          onCancel={embedded ? onCancel : undefined}
        />
      )}
      {((wizardMode === 'create' && currentStep === 2) ||
        (wizardMode === 'edit' && currentStep === 1)) && (
        <DefineDetailsStep
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          goBack={goBack}
          goNext={goNext}
          goToStep={goToStep}
          mode={wizardMode}
        />
      )}
      {((wizardMode === 'create' && currentStep === 3) ||
        (wizardMode === 'edit' && currentStep === 2)) && (
        <DefineSettingsStep
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          goBack={goBack}
          goNext={goNext}
        />
      )}
      {((wizardMode === 'create' && currentStep === 4) ||
        (wizardMode === 'edit' && currentStep === 3)) && (
        <ConfigureConnectionStep
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          goBack={goBack}
          goToStep={goToStep}
          closeModal={closeModal}
          embedded={embedded}
          onComplete={onComplete}
          mode={wizardMode}
          onSubmitConfiguration={onSubmitConfiguration}
        />
      )}
    </>
  );
}
