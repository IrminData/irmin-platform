'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useMemo, useState } from 'react';

import { IoInformationCircle } from 'react-icons/io5';

import { useLocale } from '@/context/LocaleContext';

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
        script_id: '',
        input: [],
      };
    case 'import':
      return {
        type: 'import' as const,
        connection_id: '',
        import_from_connection_paths: ['/'],
        repository: '',
        repository_branch: '',
        import_to_repository_path: '/',
        field_mappings: [],
      };
    case 'export':
      return {
        type: 'export' as const,
        connection_id: '',
        export_from_repository_paths: ['/'],
        repository: '',
        repository_branch: '',
        export_to_connection_path: '/',
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
  const { dict } = useLocale();

  // Initialize state with proper defaults
  const [wizardData, setWizardData] = useState<WorkflowWizardData>(() => {
    const initial: WorkflowWizardData = {
      ...initialWorkflowData,
      tags: initialWorkflowData.tags ?? initialWizardTags,
    };

    // Initialize workflowable if type is provided
    if (initial.type && !initial.workflowable) {
      initial.workflowable = createDefaultWorkflowable(initial.type);
    }

    return initial;
  });

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
  // Automatically initializes workflowable when type changes
  const updateWizardData = useCallback(
    (updates: Partial<WorkflowWizardData>) => {
      setWizardData((prev) => {
        const newData = { ...prev, ...updates };

        // If type changed and workflowable is missing, initialize it
        if (
          updates.type &&
          updates.type !== prev.type &&
          !newData.workflowable
        ) {
          newData.workflowable = createDefaultWorkflowable(updates.type);
        }

        return newData;
      });
    },
    []
  );

  const hasFieldMappings =
    wizardData.type === 'import' || wizardData.type === 'export';

  const workflowTypeDescription = useMemo(() => {
    const type = wizardData.type || initialWorkflowData.type;
    return type ? dict.workflow.create.typeDescription[type] : null;
  }, [
    wizardData.type,
    initialWorkflowData.type,
    dict.workflow.create.typeDescription,
  ]);

  return (
    <>
      {workflowTypeDescription && (
        <div
          className={`
            mx-4 mb-4 flex items-start gap-3 rounded-lg border
            border-accent-foreground/10 bg-accent/10 p-3
            dark:border-accent-foreground dark:bg-accent/10
          `}
        >
          <IoInformationCircle
            className={`mt-0.5 size-5 shrink-0 text-accent`}
          />
          <p className={`text-sm text-accent-foreground`}>
            {workflowTypeDescription}
          </p>
        </div>
      )}
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
