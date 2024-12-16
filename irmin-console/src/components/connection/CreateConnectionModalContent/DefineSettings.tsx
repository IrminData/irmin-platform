'use client';

import ConnectorInfoSmall from '@/components/connector/ConnectorInfoSmall';
import Button from '@/components/ui/button';
import DynamicForm from '@/components/ui/form/DynamicForm';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';

import { useLocale } from '@/context/LocaleContext';

import {
  useContinueCreateConnection,
  useFetchConnectionSettings,
} from '@/hooks/useCreateConnection';

import { ConnectionSetup } from '@/types/internal/ConnectionSetup';

export default function DefineSettings({
  connectionData,
  setConnectionData,
  setCurrentStep,
}: {
  connectionData: ConnectionSetup;
  setConnectionData: React.Dispatch<React.SetStateAction<ConnectionSetup>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { dict } = useLocale();
  const { loading: loadingSettings } = useFetchConnectionSettings(
    connectionData,
    setConnectionData
  );
  const { loading: loadingContinue, continueCreateConnection } =
    useContinueCreateConnection(
      connectionData,
      setConnectionData,
      setCurrentStep
    );

  if (
    loadingSettings ||
    loadingContinue ||
    !connectionData.connectionSettingsFields
  ) {
    return <LoadingSpinner />;
  }

  return (
    <div className='p-4 pb-6'>
      {/* Display Connector Information */}
      {connectionData.connector && (
        <div className='flex flex-col justify-center border-b py-4 dark:border-gray-800'>
          <p className='mb-2 text-sm opacity-80'>
            {dict.connections.create.selectedConnector}:
          </p>
          <ConnectorInfoSmall connector={connectionData.connector} />
        </div>
      )}

      {/* Dynamic Form Render */}
      <DynamicForm
        fields={connectionData.connectionSettingsFields}
        onSubmit={continueCreateConnection}
        submitButtonText={dict.connections.create.continue}
      />

      {/* Go Back Button */}
      <Button
        className='mb-6 inline-block w-full'
        variant='ghost'
        size='sm'
        onClick={() => setCurrentStep((currentStep) => currentStep - 1)}
      >
        {dict.connections.create.goBack}
      </Button>
    </div>
  );
}
