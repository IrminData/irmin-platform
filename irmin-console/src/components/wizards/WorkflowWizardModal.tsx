'use client';

import { useMemo, useState } from 'react';

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

  // Generate steps dynamically based on workflow type and whether type is pre-selected
  const steps = useMemo(() => {
    const stepArray = [];

    // If workflow type is not pre-selected, add the type selection step
    if (!workflowType) {
      stepArray.push(dict.workflow.create.selectWorkflowType);
    }

    // Add the workflowable configuration step (this is always present)
    stepArray.push(dict.workflow.create.configureWorkflow);

    // Add field mappings step only for import/export workflows
    if (workflowType === 'import' || workflowType === 'export') {
      stepArray.push(dict.workflow.create.configureFieldMappings);
    }

    // Add the final workflow configuration step
    stepArray.push(dict.workflow.create.confirmAndCreate);

    return stepArray;
  }, [workflowType, dict.workflow.create]);

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
        closeModal={closeModal}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
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
