'use client';

import { useState } from 'react';

import AppTitle from '@/components/appTitle';
import ConnectionSetupView from '@/components/connection-setup/connectionSetupView';
import SideModal from '@/components/misc/SideModal';
import ConnectionTable from '@/components/tables/connectionTable';
import TableSkeleton from '@/components/tables/tableSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

export default function ConnectionsPage() {
  const { dict } = useLocale();
  const { connections } = useWorkspace();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  return (
    <>
      <AppTitle title={dict.connection.connections} />
      <SideModal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        currentStep={currentStep}
        steps={[
          dict.connection.selectConnector,
          dict.connection.establishConnection,
          dict.connection.configureSettings,
          dict.connection.configureSync,
        ]}
        title={dict.connection.createNew}
      >
        <ConnectionSetupView
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      </SideModal>
      {connections.isLoading ? (
        <TableSkeleton />
      ) : (
        <ConnectionTable connections={connections.connections} />
      )}
    </>
  );
}
