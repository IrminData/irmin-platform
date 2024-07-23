'use client';

import { useState } from 'react';

import ExportSetupView from '@/components/export-sync-setup/exportSetupView';
import SideModal from '@/components/misc/SideModal';
import PortalTitle from '@/components/portalTitle';
import ExportTable from '@/components/tables/exportTable';
import TableSkeleton from '@/components/tables/tableSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

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
        <ExportTable processes={exports.exports} />
      )}
    </>
  );
}
