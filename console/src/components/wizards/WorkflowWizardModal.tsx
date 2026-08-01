'use client';

import { useCallback, useMemo, useState } from 'react';

import SideModal from '@/components/ui/popup/SideModal';

import { useLocale } from '@/context/LocaleContext';

import { useResourceAllowed } from '@/hooks/utils';

import type { WorkflowableType } from '@/types/core/Workflow';

import { WorkflowWizard } from './WorkflowWizard';

/**
 * Workflow wizard modal component that displays the workflow wizard
 */
export default function WorkflowWizardModal({
  isOpen = false,
  closeModal,
  workflowType,
}: {
  isOpen?: boolean;
  closeModal: () => void;
  workflowType?: WorkflowableType;
}) {
  const { dict } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState<
    WorkflowableType | undefined
  >(workflowType);

  // Track open count to reset wizard state when modal reopens
  const [openCount, setOpenCount] = useState(0);
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen && !wasOpen) {
    setCurrentStep(1);
    setSelectedType(workflowType);
    setOpenCount((c) => c + 1);
  }
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
  }

  const handleTypeChange = useCallback((type: WorkflowableType) => {
    setSelectedType(type);
  }, []);

  // Determine effective type for step indicator
  const effectiveType = workflowType ?? selectedType;

  // Generate steps dynamically based on the currently selected type
  const steps = useMemo(() => {
    const stepArray = [];

    // If workflow type is not pre-selected, add the type selection step
    if (!workflowType) {
      stepArray.push(dict.workflow.create.selectWorkflowType);
    }

    // Add the workflowable configuration step (this is always present)
    stepArray.push(dict.workflow.create.configureWorkflow);

    // Add field mappings step only for import/export workflows
    if (effectiveType === 'import' || effectiveType === 'export') {
      stepArray.push(dict.workflow.create.configureFieldMappings);
    }

    // Add the final workflow configuration step
    stepArray.push(dict.workflow.create.confirmAndCreate);

    return stepArray;
  }, [workflowType, effectiveType, dict.workflow.create]);

  if (!isResourceAllowed('workflow', 'create')) {
    return null;
  }

  return (
    <SideModal
      isOpen={isOpen}
      closeModal={closeModal}
      currentStep={currentStep}
      steps={steps}
      title={dict.workflow.create.createNewWorkflow}
    >
      <WorkflowWizard
        key={openCount}
        closeModal={closeModal}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        onTypeChange={handleTypeChange}
        initialWorkflowData={{
          type: workflowType,
          name: '',
          description: '',
          documentation: '',
          workflowable: undefined,
          schedule: undefined,
        }}
      />
    </SideModal>
  );
}
