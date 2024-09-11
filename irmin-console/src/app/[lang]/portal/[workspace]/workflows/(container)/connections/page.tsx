'use client';

import { useState } from 'react';

import SideModal from '@/components/common/popup/SideModal';
import PortalTitle from '@/components/portal/PortalTitle';
import ConnectionWorkflowList from '@/components/workflow/connection/ConnectionWorkflowList';
import ConnectionSetupWrapper from '@/components/workflow/connection/create/ConnectionSetupWrapper';

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
 */
export default function ConnectionsPage() {
  const { dict } = useLocale();
  const { workspaceLoading, connections } = useWorkspace();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const loading = workspaceLoading || connections.isLoading;

  return (
    <>
      <PortalTitle title={dict.portalNavigation.links.connections} />
      <SideModal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        currentStep={currentStep}
        steps={[
          dict.workflow.connection.selectConnector,
          dict.workflow.connection.establishConnection,
          dict.workflow.connection.configureSettings,
          dict.workflow.connection.configureWorkflow,
        ]}
        title={dict.workflow.connection.createNewConnectionWorkflow}
      >
        <ConnectionSetupWrapper
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      </SideModal>
      <ConnectionWorkflowList
        loading={loading}
        connectionWorkflows={connections.connections}
      />
    </>
  );
}
