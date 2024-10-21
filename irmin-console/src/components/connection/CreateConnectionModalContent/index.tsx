'use client';

import { useEffect, useState } from 'react';

import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

import { initialConnectionData } from '@/hooks/useCreateConnection';

import { Connector } from '@/types/core/Connector';
import { ConnectionSetup } from '@/types/internal/ConnectionSetup';

import ConfigureConnection from './ConfigureConnection';
import DefineDetails from './DefineDetails';
import DefineSettings from './DefineSettings';
import SelectConnector from './SelectConnector';

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
const CreateConnectionModalContent = ({
  connectors,
  isOpen,
  closeModal,
  currentStep,
  setCurrentStep,
}: {
  connectors: Connector[];
  isOpen: boolean;
  closeModal: () => void;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const [connectionData, setConnectionData] = useState<ConnectionSetup>(
    initialConnectionData
  );

  // Reset connection data when modal is closed
  useEffect(() => {
    setCurrentStep(1);
    setConnectionData(initialConnectionData);
  }, [isOpen, setCurrentStep, setConnectionData]);

  if (
    connectors.length === 0 ||
    (currentStep > 1 && !connectionData.connector)
  ) {
    return <LoadingSpinner />;
  }
  return (
    <>
      {currentStep === 1 && (
        <SelectConnector
          connectors={connectors}
          connectionData={connectionData}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 2 && (
        <DefineDetails
          connectionData={connectionData}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 3 && (
        <DefineSettings
          connectionData={connectionData}
          setConnectionData={setConnectionData}
          setCurrentStep={setCurrentStep}
        />
      )}
      {currentStep === 4 && (
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

export default CreateConnectionModalContent;
