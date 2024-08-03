'use client';

import { useState } from 'react';

import ExportSetupView from '@/components/export-sync-setup/exportSetupView';
import SideModal from '@/components/misc/SideModal';
import PortalTitle from '@/components/portal/portalTitle';
import ExportTable from '@/components/portal/tables/exportTable';
import TableSkeleton from '@/components/portal/tables/tableSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Portal export syncs page
 *
 * @remarks
 *
 * This page is used to manage export syncs in the portal.
 * It shows a list of export syncs that are available in the workspace.
 * It allows the user to create a new export sync.
 *
 * It uses the WorkspaceContext to fetch and manage export sync data.
 *
 * @returns UI for managing export syncs
 */
export default function ExportSyncsPage() {
  const { dict } = useLocale();
  const { exports } = useWorkspace();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  return (
    <>
      <PortalTitle title={dict.export.exportSyncs} />
      <SideModal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        currentStep={currentStep}
        steps={[
          dict.export.selectSourceDataset,
          dict.export.selectDestinationConnection,
          dict.export.configureExport,
        ]}
        title={dict.export.createNewExportSync}
      >
        <ExportSetupView
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      </SideModal>
      {exports.isLoading ? (
        <TableSkeleton />
      ) : (
        <ExportTable exportWorkflows={exports.exports} />
      )}
    </>
  );
}
