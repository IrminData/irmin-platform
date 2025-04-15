'use client';

import { useEffect } from 'react';

import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

import {
  CreateConnectionProvider,
  useCreateConnection,
} from '@/context/CreateConnectionContext';

import { Connector } from '@/types/core/Connector';

import ConfigureConnection from './ConfigureConnection';
import DefineDetails from './DefineDetails';
import DefineSettings from './DefineSettings';
import SelectConnector from './SelectConnector';

/**
 * Inner component that consumes the connection creation context.
 *
 * It renders the appropriate step of the connection creation process,
 * and resets the state when the modal is opened.
 */
const CreateConnectionModalContentInner = ({ isOpen }: { isOpen: boolean }) => {
  const { currentStep, filteredConnectors, resetCreateConnection } =
    useCreateConnection();

  // Reset connection data and step when the modal is opened or closed.
  useEffect(() => {
    resetCreateConnection();
  }, [isOpen, resetCreateConnection]);

  if (filteredConnectors.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <>
      {currentStep === 1 && <SelectConnector />}
      {currentStep === 2 && <DefineDetails />}
      {currentStep === 3 && <DefineSettings />}
      {currentStep === 4 && <ConfigureConnection />}
    </>
  );
};

/**
 * Modal content wrapper for creating a connection.
 *
 * This component provides the create connection context to its children.
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
  return (
    <CreateConnectionProvider
      connectors={connectors}
      closeModal={closeModal}
      currentStep={currentStep}
      setCurrentStep={setCurrentStep}
    >
      <CreateConnectionModalContentInner isOpen={isOpen} />
    </CreateConnectionProvider>
  );
};

export default CreateConnectionModalContent;
