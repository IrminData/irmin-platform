'use client';

import React, { useEffect, useMemo, useState } from 'react';

import IrminCore from '@/services/core/IrminCore';

import LoadingSpinner from '@/components/common/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { Connector } from '@/types/api/Connector';
import {
  DynamicFields,
  DynamicFieldValues,
} from '@/types/internal/DynamicField';

import ConfigureConnection from './step/ConfigureConnection';
import DefineDetails from './step/DefineDetails';
import DefineSettings from './step/DefineSettings';
import SelectConnector from './step/SelectConnector';

/**
 * Connection setup object
 * @typeParam name - Connection name
 * @typeParam description - Connection description
 * @typeParam connector - Which connector to use
 * @typeParam connectionDetailsFields - Connection details fields
 * @typeParam connectionSettingsFields - Connection settings fields
 * @typeParam connectionDetails - Connection details with user input
 * @typeParam connectionSettings - Connection settings with user input
 */
export interface ConnectionSetup {
  name: string;
  description: string;
  connector: null | Connector;
  connectionDetailsFields: null | DynamicFields;
  connectionSettingsFields: null | DynamicFields;
  connectionDetails: null | DynamicFieldValues;
  connectionSettings: null | DynamicFieldValues;
}

/**
 * Empty connection setup data
 */
const initialConnectionData: ConnectionSetup = {
  name: '',
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
const ConnectionCreateSection = ({
  isOpen,
  closeModal,
  currentStep,
  setCurrentStep,
}: {
  isOpen: boolean;
  closeModal: () => void;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const { locale } = useLocale();
  const { irminAlert } = usePopup();
  const [connectionData, setConnectionData] = useState<ConnectionSetup>(
    initialConnectionData
  );
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const { connectorService } = useMemo(() => new IrminCore(locale), [locale]);

  // Reset connection data when modal is closed
  useEffect(() => {
    setCurrentStep(1);
    setConnectionData(initialConnectionData);
  }, [isOpen, setCurrentStep, setConnectionData]);

  // Fetch all available connectors
  useEffect(() => {
    (async () => {
      try {
        const response = await connectorService.fetchAllConnectors();
        if (!response || response.data.length === 0) {
          irminAlert('error', 'Failed to fetch connectors');
        }
        setConnectors(response.data);
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
          connectionData={connectionData}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 2 && connectionData.connector && (
        <DefineDetails
          connectionData={connectionData}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 3 && connectionData.connector && (
        <DefineSettings
          connectionData={connectionData}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 4 && connectionData.connector && (
        <ConfigureConnection
          connectionData={connectionData}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
          closeModal={closeModal}
        />
      )}
    </>
  );
};

export default ConnectionCreateSection;
