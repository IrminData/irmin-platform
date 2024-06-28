'use client';

import { useState } from 'react';
import AppTitle from '@/components/appTitle';
import ConnectionTable from '@/components/tables/connectionTable';
import ConnectionSetupView from '@/components/connection-setup/connectionSetupView';
import SideModal from '@/components/misc/SideModal';
import { useWorkspace } from '@/context/WorkspaceContext';
import TableSkeleton from '@/components/tables/tableSkeleton';

export default function ConnectionsPage() {
  const { connections } = useWorkspace();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  return (
    <>
      <AppTitle title='Connections' />
      <SideModal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        currentStep={currentStep}
        steps={[
          'Select a connector',
          'Establish connection',
          'Connection settings',
          'Configure sync',
        ]}
        title='Create a new connection'
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
