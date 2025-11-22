'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useState } from 'react';

import type {
  Workflow,
  Workflowable,
  WorkflowableType,
} from '@/types/core/Workflow';

import ConfigureFieldMappingsStep from './steps/ConfigureFieldMappingsStep';
import ConfigureWorkflowableStep from './steps/ConfigureWorkflowableStep';
import ConfigureWorkflowStep from './steps/ConfigureWorkflowStep';
import SelectWorkflowTypeStep from './steps/SelectWorkflowTypeStep';
import type { WorkflowWizardData } from './types';

/**
 * Creates a default workflowable structure based on the workflow type
 */
const createDefaultWorkflowable = (type: WorkflowableType): Workflowable => {
  switch (type) {
    case 'action':
      return {
        type: 'action' as const,
        executable: '',
        input: [],
      };
    case 'import':
      return {
        type: 'import' as const,
        connection_id: '',
        import_from_connection_paths: [],
        repository: '',
        repository_branch: '',
        import_to_repository_path: '',
        field_mappings: [],
      };
    case 'export':
      return {
        type: 'export' as const,
        connection_id: '',
        export_from_repository_paths: [],
        repository: '',
        repository_branch: '',
        export_to_connection_path: '',
        field_mappings: [],
      };
    case 'pipeline':
      return {
        type: 'pipeline' as const,
        live: false,
        stages: [],
      };
    default:
      throw new Error(`Unknown workflow type: ${type}`);
  }
};

const initialWizardTags: WorkflowWizardData['tags'] = [];

/**
 * Main content component for the Workflow Wizard
 *
 * Manages the wizard state and renders the appropriate step component
 * Can be used in standalone mode (in a modal) or embedded mode (inside another wizard)
 */
export default function WorkflowWizard({
  closeModal,
  currentStep,
  setCurrentStep,
  initialWorkflowData,
  embedded = false,
  onComplete,
  onCancel,
}: {
  closeModal: () => void;
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  initialWorkflowData: WorkflowWizardData;
  embedded?: boolean;
  onComplete?: (workflow: Workflow) => void;
  onCancel?: () => void;
}) {
  const [wizardData, setWizardData] =
    useState<WorkflowWizardData>(initialWorkflowData);

  // Initialize workflowable if type is provided but workflowable is undefined
  useEffect(() => {
    if (initialWorkflowData.type && !initialWorkflowData.workflowable) {
      const defaultWorkflowable = createDefaultWorkflowable(
        initialWorkflowData.type
      );
      queueMicrotask(() => {
        setWizardData((prev) => ({
          ...prev,
          workflowable: defaultWorkflowable,
        }));
      });
    }
  }, [initialWorkflowData.type, initialWorkflowData.workflowable]);

  // Initialize workflowable when type is selected via UI
  useEffect(() => {
    if (wizardData.type && !wizardData.workflowable) {
      const defaultWorkflowable = createDefaultWorkflowable(wizardData.type);
      queueMicrotask(() => {
        setWizardData((prev) => ({
          ...prev,
          workflowable: defaultWorkflowable,
        }));
      });
    }
  }, [wizardData.type, wizardData.workflowable]);

  useEffect(() => {
    if (!initialWorkflowData.tags && !wizardData.tags) {
      queueMicrotask(() => {
        setWizardData((prev) => ({
          ...prev,
          tags: initialWizardTags,
        }));
      });
    }
  }, [initialWorkflowData.tags, wizardData.tags]);

  // Function to go to the next step
  const goNext = useCallback(() => {
    const hasFieldMappings =
      wizardData.type === 'import' || wizardData.type === 'export';
    // Adjust maxSteps based on whether initialWorkflowData.type is provided
    const maxSteps = hasFieldMappings
      ? initialWorkflowData.type
        ? 3
        : 4
      : initialWorkflowData.type
        ? 2
        : 3;
    if (currentStep < maxSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, setCurrentStep, wizardData.type, initialWorkflowData.type]);

  // Function to go back to the previous step
  const goBack = useCallback(() => {
    const minStep = initialWorkflowData.type ? 2 : 1;
    if (currentStep > minStep) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep, setCurrentStep, initialWorkflowData]);

  // Function to update wizard data
  const updateWizardData = useCallback(
    (updates: Partial<WorkflowWizardData>) => {
      setWizardData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const hasFieldMappings =
    wizardData.type === 'import' || wizardData.type === 'export';

  return (
    <>
      {!initialWorkflowData.type && currentStep === 1 && (
        <SelectWorkflowTypeStep
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          goNext={goNext}
          onCancel={embedded ? onCancel : undefined}
        />
      )}
      {currentStep === (initialWorkflowData.type ? 1 : 2) && (
        <ConfigureWorkflowableStep
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          goNext={goNext}
          goBack={goBack}
        />
      )}
      {currentStep === (initialWorkflowData.type ? 2 : 3) &&
        hasFieldMappings && (
          <ConfigureFieldMappingsStep
            wizardData={wizardData}
            updateWizardData={updateWizardData}
            goBack={goBack}
            goNext={goNext}
          />
        )}
      {currentStep ===
        (hasFieldMappings
          ? initialWorkflowData.type
            ? 3
            : 4
          : initialWorkflowData.type
            ? 2
            : 3) && (
        <ConfigureWorkflowStep
          wizardData={wizardData}
          updateWizardData={updateWizardData}
          goBack={goBack}
          closeModal={closeModal}
          embedded={embedded}
          onComplete={onComplete}
        />
      )}
    </>
  );
}
