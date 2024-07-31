'use client';

import React, { useEffect, useState } from 'react';

import ConnectorService from '@/services/api/ConnectorService';

import DefineConnectionDetails from '@/components/connection-setup/defineConnectionDetails';
import DefineConnectionSettings from '@/components/connection-setup/defineConnectionSettings';
import DefineSync from '@/components/connection-setup/defineSync';
import { SelectConnector } from '@/components/connection-setup/selectConnector';
import LoadingSpinner from '@/components/misc/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Connector } from '@/types/api/Connector';
import { ConnectionSetup } from '@/types/internal/ConnectionSetup';

const initialConnectionData: ConnectionSetup = {
  name: '',
  cron: '0 0 * * *',
  description: '',
  connector: null,
  connectionDetailsFields: null,
  connectionSettingsFields: null,
  connectionDetails: null,
  connectionSettings: null,
};

/**
 * Connection setup view
 *
 * @remarks
 *
 * View to setup a new connection.
 *
 * It is wrapped in a side modal and is used to setup a new
 * connection. It includes steps to select a connector, define
 * connection details, connection settings and sync settings.
 *
 * This component fetches all available connectors and is responsible
 * for maanging the state of the connection creation process.
 */
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
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const connectorService = ConnectorService.getInstance(locale);
  const [connectionData, setConnectionData] = useState<ConnectionSetup>(
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
    (async () => {
      try {
        const savedConnectors = await connectorService.getAllConnectors();
        if (savedConnectors && savedConnectors.length > 0) {
          setConnectors(savedConnectors);
        } else {
          const response = await connectorService.fetchAllConnectors();
          if (!response || response.data.length === 0) {
            irminAlert('error', 'Failed to fetch connectors');
          }
          setConnectors(response.data);
        }
      } catch (error) {
        console.error('Fetch connectors error:', error);
        irminAlert('error', 'Failed to fetch connectors');
      }
    })();
  }, [connectorService, irminAlert]);

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
