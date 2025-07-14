'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ConnectionSetup } from '@/types/internal/ConnectionSetup';

import ConfigureConnection from './ConfigureConnection';
import DefineDetails from './DefineDetails';
import DefineSettings from './DefineSettings';
import SelectConnector from './SelectConnector';

/**
 * Initial connection data state.
 */
const initialConnectionData: ConnectionSetup = {
  name: '',
  description: '',
  connector: undefined,
  connectionDetailsFields: undefined,
  connectionSettingsFields: undefined,
  connectionDetails: undefined,
  connectionSettings: undefined,
};

/**
 * Modal content wrapper for creating a connection.
 *
 * This component provides the create connection context to its children.
 */
const CreateConnectionModalContent = ({
  isOpen,
  closeModal,
  currentStep,
  setCurrentStep,
}: {
  isOpen: boolean;
  closeModal: () => void;
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
}) => {
  // State to hold connection data
  const [connectionData, setConnectionData] = useState<ConnectionSetup>(
    initialConnectionData
  );

  // Reset the connection data when the modal is closed
  const prevOpen = useRef(isOpen);
  useEffect(() => {
    if (prevOpen.current && !isOpen) {
      setConnectionData(initialConnectionData);
    }
    prevOpen.current = isOpen;
  }, [isOpen]);

  // Function to go to the next step
  const goNext = useCallback(() => {
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, setCurrentStep]);

  // Function to go back to the previous step
  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep, setCurrentStep]);

  return (
    <>
      {currentStep === 1 && (
        <SelectConnector
          setConnectionData={setConnectionData}
          goNext={goNext}
        />
      )}
      {currentStep === 2 && (
        <DefineDetails
          connectionData={connectionData}
          setConnectionData={setConnectionData}
          goBack={goBack}
          goNext={goNext}
        />
      )}
      {currentStep === 3 && (
        <DefineSettings
          connectionData={connectionData}
          setConnectionData={setConnectionData}
          goBack={goBack}
          goNext={goNext}
        />
      )}
      {currentStep === 4 && (
        <ConfigureConnection
          connectionData={connectionData}
          setConnectionData={setConnectionData}
          goBack={goBack}
          closeModal={closeModal}
        />
      )}
    </>
  );
};

export default CreateConnectionModalContent;
