'use client';

import React, { useState, useEffect } from 'react';

import { SelectConnector } from '@/components/connection-setup/selectConnector';
import DefineConnectionDetails from '@/components/connection-setup/defineConnectionDetails';
import DefineConnectionSettings from '@/components/connection-setup/defineConnectionSettings';
import DefineSync from '@/components/connection-setup/defineSync';
import ConnectionService from '@/lib/ConnectionService';
import { Connector } from '@/types/Connector';
import { usePopup } from '@/context/PopupContext';

export interface connectionDataType {
  connectionID: null | number;
  name: string;
  connectorID: null | number;
  connectionDetails: any | null;
  settings: any | null;
  cron: string;
}

const ConnectionSetupView = ({
  setIsOpen,
  currentStep,
  setCurrentStep,
}: {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const { irminAlert } = usePopup();
  const connectionService = ConnectionService.getInstance();
  const [connectionData, setConnectionData] = useState<connectionDataType>({
    connectionID: null,
    name: '',
    connectorID: null,
    connectionDetails: null,
    settings: null,
    cron: '1 0 * JAN *',
  });
  const [connectors, setConnectors] = useState<Connector[]>([]);

  useEffect(() => {
    connectionService
      .fetchAllConnectors()
      .then((response) => {
        setConnectors(response.data);
      })
      .catch((error) => {
        console.error('Fetch connectors error:', error);
        irminAlert('error', 'Failed to fetch connectors');
      });
  }, [connectionService, irminAlert]);

  if (connectors.length === 0) return <></>;

  return (
    <>
      {currentStep === 1 && (
        <SelectConnector
          connectors={connectors}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 2 && (
        <DefineConnectionDetails
          connectors={connectors}
          connectionData={connectionData}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 3 && (
        <DefineConnectionSettings
          connectors={connectors}
          connectionData={connectionData}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 4 && (
        <DefineSync
          connectors={connectors}
          connectionData={connectionData}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
          setIsOpen={setIsOpen}
        />
      )}
    </>
  );
};

export default ConnectionSetupView;
