'use client';

import { useState } from 'react';

import SideModal from '@/components/common/popup/SideModal';
import PortalTitle from '@/components/portal/PortalTitle';
import ExportSetupView from '@/components/workflow/export/create/exportSetupView';
import ExportWorkflowList from '@/components/workflow/export/ExportWorkflowList';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * List and manage Export Workflows
 *
 * @remarks
 *
 * This page is used to manage Export Workflows in the portal.
 * It shows a list of Export Workflows that are available in the workspace.
 * It allows the user to create new Export Workflow.
 */
export default function ExportsPage() {
  const { dict } = useLocale();
  const { workspaceLoading, exports } = useWorkspace();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const loading = workspaceLoading || exports.isLoading;

  return (
    <>
      <PortalTitle title={dict.portalNavigation.links.exports} />
      <SideModal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        currentStep={currentStep}
        steps={[
          dict.workflow.export.selectSourceRepository,
          dict.workflow.export.selectDestinationConnection,
          dict.workflow.export.configureExport,
        ]}
        title={dict.workflow.export.createNewExportWorkflow}
      >
        <ExportSetupView
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      </SideModal>
      <ExportWorkflowList loading={loading} exportWorkflows={exports.exports} />
    </>
  );
}
