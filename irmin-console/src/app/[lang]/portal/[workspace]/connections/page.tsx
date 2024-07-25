'use client';

import { useState } from 'react';

import ConnectionSetupView from '@/components/connection-setup/connectionSetupView';
import SideModal from '@/components/misc/SideModal';
import PortalTitle from '@/components/portalTitle';
import ConnectionTable from '@/components/tables/connectionTable';
import TableSkeleton from '@/components/tables/tableSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Portal connections page
 *
 * @remarks
 *
 * This page is used to manage connections in the portal.
 * It shows a list of connections that are available in the workspace.
 *
 * It uses the WorkspaceContext to fetch and manage connection data.
 *
 * It uses SideModal to create a new connection.
 *
 * @returns UI for managing connections
 */
export default function ConnectionsPage() {
  const { dict } = useLocale();
  const { connections } = useWorkspace();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  return (
    <>
      <PortalTitle title={dict.connection.connections} />
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
