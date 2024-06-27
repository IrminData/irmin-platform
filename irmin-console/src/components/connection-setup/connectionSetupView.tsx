'use client';

import React, { useState, useEffect } from 'react';

import { SelectConnector } from '@/components/connection-setup/selectConnector';
import DefineConnectionDetails from '@/components/connection-setup/defineConnectionDetails';
import DefineConnectionSettings from '@/components/connection-setup/defineConnectionSettings';
import DefineSync from '@/components/connection-setup/defineSync';
import ConnectionService from '@/lib/ConnectionService';
import {
  ConnectionDetailsAndSettings,
  ConnectionDetailsAndSettingsFields,
  Connector,
} from '@/types/Connector';
import { usePopup } from '@/context/PopupContext';
import LoadingSpinner from '../misc/LoadingSpinner';

export interface connectionDataType {
  name: string;
  cron: string;
  connector: null | Connector;
  connectionDetailsFields: null | ConnectionDetailsAndSettingsFields;
  connectionSettingsFields: null | ConnectionDetailsAndSettingsFields;
  connectionDetails: null | ConnectionDetailsAndSettings;
  connectionSettings: null | ConnectionDetailsAndSettings;
}

const initialConnectionData: connectionDataType = {
  name: '',
  cron: '0 0 * * *',
  connector: null,
  connectionDetailsFields: null,
  connectionSettingsFields: null,
  connectionDetails: null,
  connectionSettings: null,
};

const ConnectionSetupView = ({
  isOpen,
  setIsOpen,
  currentStep,
  setCurrentStep,
}: {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const { irminAlert } = usePopup();
  const connectionService = ConnectionService.getInstance();
  const [connectionData, setConnectionData] = useState<connectionDataType>(
    initialConnectionData
  );
  const [connectors, setConnectors] = useState<Connector[]>([]);

  // Reset connection data when modal is closed
  useEffect(() => {
    setCurrentStep(1);
    setConnectionData(initialConnectionData);
  }, [isOpen, setCurrentStep, setConnectionData]);

  // Fetch all available connectors
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

  if (
    connectors.length === 0 ||
    (currentStep > 1 && !connectionData.connector)
  ) {
    return <LoadingSpinner />;
  }
  return (
    <>
      {currentStep === 1 && connectors.length > 0 && (
        <SelectConnector
          connectors={connectors}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 2 && connectionData.connector && (
        <DefineConnectionDetails
          connectionData={connectionData}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 3 && connectionData.connector && (
        <DefineConnectionSettings
          connectionData={connectionData}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 4 && connectionData.connector && (
        <DefineSync
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
