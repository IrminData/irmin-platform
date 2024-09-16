'use client';

import { useState } from 'react';

import SideModal from '@/components/common/popup/SideModal';
import ConnectionList from '@/components/connection/ConnectionList';
import ConnectionSetupWrapper from '@/components/connection/create/ConnectionSetupWrapper';
import PortalTitle from '@/components/portal/PortalTitle';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Page to list and manage Connections
 */
export default function ConnectionsPage() {
  const { dict } = useLocale();
  const { workspaceLoading, connections } = useWorkspace();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const loading = workspaceLoading || connections.isLoading;

  return (
    <div className='container relative mx-auto max-w-6xl'>
      <PortalTitle title={dict.portalNavigation.links.connections} />
      <SideModal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        currentStep={currentStep}
        steps={[
          dict.connections.create.selectConnector,
          dict.connections.create.establishConnection,
          dict.connections.create.configureSettings,
          dict.connections.create.configureConnection,
        ]}
        title={dict.connections.create.createNewConnection}
      >
        <ConnectionSetupWrapper
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      </SideModal>
      <ConnectionList loading={loading} connections={connections.connections} />
    </div>
  );
}
