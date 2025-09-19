'use client';

import { useCallback, useEffect, useState } from 'react';

import { TbHelp, TbSearch } from 'react-icons/tb';

import ConnectorInfoSmall from '@/components/connector/ConnectorInfoSmall';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DynamicForm from '@/components/ui/form/DynamicForm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConnectionCreationSkeleton } from '@/components/ui/loading/ConnectionCreationSkeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import {
  useConnectionConfiguration,
  useConnections,
  useConnectors,
} from '@/hooks/api';

import { convertToConnectionFieldValues } from '@/utils/convertToConnectionFieldValues';

import type { Connection } from '@/types/core/Connection';
import type { Connector, ConnectorCategory } from '@/types/core/Connector';
import type {
  DynamicFields,
  DynamicFieldValues,
} from '@/types/internal/DynamicField';

import type { DataImportWizardData } from '../types';

/**
 * Step 1: Connect to Data Source
 *
 * Users can either select an existing connection or create a new one
 */
export default function ConnectDataSourceStep({
  wizardData,
  updateWizardData,
  goNext,
}: {
  wizardData: DataImportWizardData;
  updateWizardData: (updates: Partial<DataImportWizardData>) => void;
  goNext: () => void;
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();
  const { connectionsQuery, createConnectionMutation } = useConnections();
  const { connectorsQuery } = useConnectors();

  const [categoryFilterOptions, setCategoryFilterOptions] = useState<string[]>(
    []
  );
  const [activeCategory, setActiveCategory] = useState<string>(
    dict.connections.create.categoryAll
  );
  const [filteredConnectors, setFilteredConnectors] = useState<Connector[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(
    null
  );

  // Connection creation state
  const [connectionCreationStep, setConnectionCreationStep] = useState(1);
  const [connectionDetails, setConnectionDetails] =
    useState<DynamicFieldValues>({});
  const [connectionSettings, setConnectionSettings] =
    useState<DynamicFieldValues>({});

  // Filter connections based on search
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConnections, setFilteredConnections] = useState<Connection[]>(
    []
  );

  useEffect(() => {
    if (connectionsQuery.data?.data) {
      const filtered = connectionsQuery.data.data.filter((connection) =>
        connection.name
          .trim()
          .replace(/\s+/g, '')
          .toLowerCase()
          .includes(searchQuery.trim().replace(/\s+/g, '').toLowerCase())
      );
      setFilteredConnections(filtered);
    }
  }, [connectionsQuery.data?.data, searchQuery]);

  useEffect(() => {
    if (connectorsQuery.data?.data) {
      // Get all unique categories from the connectors
      const filterOptions = connectorsQuery.data.data
        .map((connector) => [
          ...connector.categories,
          connector.primary_category,
        ])
        .flat();
      setCategoryFilterOptions([
        dict.connections.create.categoryAll,
        ...Array.from(new Set(filterOptions)),
      ]);

      // Set the filtered connectors to all connectors
      const filteredConnectors = connectorsQuery.data.data.filter(
        (connector) =>
          connector.primary_category === activeCategory ||
          connector.categories.includes(activeCategory as ConnectorCategory)
      );
      setFilteredConnectors(
        activeCategory && activeCategory !== dict.connections.create.categoryAll
          ? filteredConnectors
          : connectorsQuery.data.data
      );
    }
  }, [dict, connectorsQuery.data, activeCategory]);

  // Reset connection creation state when switching modes
  useEffect(() => {
    if (!wizardData.createNewConnection) {
      setConnectionCreationStep(1);
      setSelectedConnector(null);
      setConnectionDetails({});
      setConnectionSettings({});
    }
  }, [wizardData.createNewConnection]);

  const handleContinue = useCallback(() => {
    if (wizardData.createNewConnection) {
      if (!selectedConnector) {
        irminAlert('error', dict.connections.create.pleaseSelectConnector);
        return;
      }
      updateWizardData({
        connectionData: {
          ...wizardData.connectionData,
          connector: selectedConnector,
        },
      });
    } else {
      if (!wizardData.connection) {
        irminAlert('error', dict.wizard.pleaseSelectConnection);
        return;
      }
    }
    goNext();
  }, [
    wizardData,
    selectedConnector,
    irminAlert,
    goNext,
    updateWizardData,
    dict,
  ]);

  const handleCreateConnection = useCallback(
    async (formValues: DynamicFieldValues) => {
      try {
        const res = await createConnectionMutation.mutateAsync({
          connectorID: selectedConnector?.id ?? '',
          name:
            wizardData.connectionData.name ||
            `${selectedConnector?.name} ${Date.now()}`,
          description: formValues.description as string,
          documentation: '',
          details: convertToConnectionFieldValues(connectionDetails),
          settings: convertToConnectionFieldValues(connectionSettings),
        });

        if (!res.data) {
          throw new Error(res.message ?? 'Failed to create connection');
        }

        // Update wizard data with the created connection
        updateWizardData({
          connection: res.data,
          connectionData: {
            ...wizardData.connectionData,
            connector: selectedConnector ?? undefined,
            name: res.data.name,
            description: res.data.description,
          },
        });

        irminAlert('success', res.message ?? 'Connection created successfully');
        goNext();
      } catch (error) {
        console.error(error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to create connection'
        );
      }
    },
    [
      selectedConnector,
      wizardData.connectionData,
      connectionDetails,
      connectionSettings,
      createConnectionMutation,
      updateWizardData,
      irminAlert,
      goNext,
    ]
  );

  if (connectionsQuery.isLoading || connectorsQuery.isLoading) {
    return <ConnectionCreationSkeleton variant='connectors' />;
  }

  return (
    <div className='flex w-full flex-col space-y-6 px-4 py-8'>
      <div className='flex flex-col gap-4'>
        <div>
          <h3 className='mb-2 text-lg font-semibold'>
            {dict.wizard.connectToDataSource}
          </h3>
          <p
            className={`
              text-sm text-gray-600
              dark:text-gray-400
            `}
          >
            {dict.wizard.connectToDataSourceDescription}
          </p>
        </div>

        <RadioGroup
          value={wizardData.createNewConnection ? 'new' : 'existing'}
          onValueChange={(value) => {
            updateWizardData({
              createNewConnection: value === 'new',
              connection: value === 'existing' ? wizardData.connection : null,
            });
          }}
          className='space-y-4'
        >
          <div className='flex items-center space-x-2'>
            <RadioGroupItem value='existing' id='existing' />
            <Label htmlFor='existing' className='flex-1'>
              <div className='flex flex-col'>
                <span className='font-medium'>
                  {dict.wizard.useExistingConnection}
                </span>
                <span
                  className={`
                    text-sm text-gray-600
                    dark:text-gray-400
                  `}
                >
                  {dict.wizard.selectFromExistingConnections}
                </span>
              </div>
            </Label>
          </div>
          <div className='flex items-center space-x-2'>
            <RadioGroupItem value='new' id='new' />
            <Label htmlFor='new' className='flex-1'>
              <div className='flex flex-col'>
                <span className='font-medium'>
                  {dict.wizard.createNewConnection}
                </span>
                <span
                  className={`
                    text-sm text-gray-600
                    dark:text-gray-400
                  `}
                >
                  {dict.wizard.setupNewConnectionToDataSource}
                </span>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {!wizardData.createNewConnection ? (
        // Existing connections selection
        <div className='space-y-4'>
          <div>
            <h4 className='mb-2 font-medium'>{dict.wizard.selectConnection}</h4>
            <Input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={dict.wizard.searchConnections}
              icon={<TbSearch />}
            />
          </div>

          <div className='max-h-64 space-y-2 overflow-y-auto'>
            {filteredConnections.length === 0 ? (
              <p className='py-4 text-center text-sm text-gray-500'>
                {searchQuery
                  ? dict.wizard.noConnectionsFound
                  : dict.wizard.noConnectionsAvailable}
              </p>
            ) : (
              filteredConnections.map((connection) => (
                <button
                  key={connection.id}
                  type='button'
                  className={`
                    w-full rounded-lg border p-3 text-left transition-colors
                    ${
                      wizardData.connection?.id === connection.id
                        ? `bg-card`
                        : `
                          border-gray-200
                          hover:border-gray-300
                          dark:border-gray-700 dark:hover:border-gray-600
                        `
                    }
                  `}
                  onClick={() => updateWizardData({ connection })}
                >
                  <div className='flex items-center gap-3'>
                    <Avatar className='size-10'>
                      <AvatarImage
                        src={connection.connector.logo_url}
                        alt={connection.connector.name}
                      />
                      <AvatarFallback>
                        {connection.connector.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className='flex-1'>
                      <div className='font-medium'>{connection.name}</div>
                      <div
                        className={`
                          text-sm text-gray-600
                          dark:text-gray-400
                        `}
                      >
                        {connection.description || dict.wizard.noDescription}
                      </div>
                    </div>
                    <Badge variant='secondary'>
                      {connection.connector.primary_category}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        // New connection creation - multi-step process
        <div className='rounded-lg bg-card p-4 text-card-foreground'>
          <ConnectionCreationFlow
            connectionCreationStep={connectionCreationStep}
            setConnectionCreationStep={setConnectionCreationStep}
            selectedConnector={selectedConnector}
            setSelectedConnector={setSelectedConnector}
            connectionDetails={connectionDetails}
            setConnectionDetails={setConnectionDetails}
            connectionSettings={connectionSettings}
            setConnectionSettings={setConnectionSettings}
            categoryFilterOptions={categoryFilterOptions}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            filteredConnectors={filteredConnectors}
            handleCreateConnection={handleCreateConnection}
            createConnectionMutation={createConnectionMutation}
          />
        </div>
      )}

      <div
        className={`
          border-t pt-4
          dark:border-gray-800
        `}
      >
        <Button
          className='w-full'
          size='lg'
          variant='default'
          onClick={handleContinue}
          disabled={
            wizardData.createNewConnection
              ? connectionCreationStep < 4 || !selectedConnector
              : !wizardData.connection
          }
        >
          {dict.connections.create.continue}
        </Button>
      </div>

      <div className='flex items-center justify-between'>
        <Button
          variant='secondary'
          size='sm'
          onClick={() => {
            irminAlert(
              'info',
              'This feature is not available yet. To build and use custom connectors, please contact support.'
            );
          }}
          aria-label={dict.connections.create.addCustomConnector}
        >
          {dict.connections.create.addCustomConnector}
        </Button>
        <Button
          variant='ghost'
          icon={<TbHelp size={18} />}
          href='/contact'
          target='_blank'
          aria-label={dict.wizard.goToSupportPage}
        >
          {dict.connections.create.contactSupport}
        </Button>
      </div>
    </div>
  );
}

/**
 * Multi-step connection creation flow component
 */
function ConnectionCreationFlow({
  connectionCreationStep,
  setConnectionCreationStep,
  selectedConnector,
  setSelectedConnector,
  connectionDetails,
  setConnectionDetails,
  connectionSettings,
  setConnectionSettings,
  categoryFilterOptions,
  activeCategory,
  setActiveCategory,
  filteredConnectors,
  handleCreateConnection,
  createConnectionMutation,
}: {
  connectionCreationStep: number;
  setConnectionCreationStep: (step: number) => void;
  selectedConnector: Connector | null;
  setSelectedConnector: (connector: Connector | null) => void;
  connectionDetails: DynamicFieldValues;
  setConnectionDetails: (details: DynamicFieldValues) => void;
  connectionSettings: DynamicFieldValues;
  setConnectionSettings: (settings: DynamicFieldValues) => void;
  categoryFilterOptions: string[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  filteredConnectors: Connector[];
  handleCreateConnection: (formValues: DynamicFieldValues) => void;
  createConnectionMutation: ReturnType<
    typeof useConnections
  >['createConnectionMutation'];
}) {
  const { dict } = useLocale();
  const { irminAlert } = usePopup();

  const {
    connectionConfigurationQuery: detailsQuery,
    validateConnectorConfigurationMutation: validateDetailsMutation,
  } = useConnectionConfiguration('details', selectedConnector?.id);

  const {
    connectionConfigurationQuery: settingsQuery,
    validateConnectorConfigurationMutation: validateSettingsMutation,
  } = useConnectionConfiguration(
    'settings',
    selectedConnector?.id,
    connectionDetails
      ? convertToConnectionFieldValues(connectionDetails)
      : undefined
  );

  const goNext = useCallback(() => {
    if (connectionCreationStep < 4) {
      setConnectionCreationStep(connectionCreationStep + 1);
    }
  }, [connectionCreationStep, setConnectionCreationStep]);

  const goBack = useCallback(() => {
    if (connectionCreationStep > 1) {
      setConnectionCreationStep(connectionCreationStep - 1);
    }
  }, [connectionCreationStep, setConnectionCreationStep]);

  const handleConnectorSelect = useCallback(() => {
    if (!selectedConnector) {
      irminAlert('error', 'Please select a connector');
      return;
    }
    goNext();
  }, [selectedConnector, irminAlert, goNext]);

  const handleDetailsSubmit = useCallback(
    async (formValues: DynamicFieldValues) => {
      try {
        const { irmin_connection_name: _irmin_connection_name, ...details } =
          formValues;

        const res = await validateDetailsMutation.mutateAsync({
          details: convertToConnectionFieldValues(details),
          settings: connectionSettings
            ? convertToConnectionFieldValues(connectionSettings)
            : undefined,
        });

        if (res.data?.can_connect && res.data.connection_details_valid) {
          irminAlert('success', dict.connections.create.success);
          setConnectionDetails(details);
          goNext();
        } else {
          irminAlert('error', dict.connections.create.failed);
        }
      } catch (error) {
        console.error('Test connection error:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to test connection'
        );
      }
    },
    [
      connectionSettings,
      validateDetailsMutation,
      irminAlert,
      setConnectionDetails,
      goNext,
      dict,
    ]
  );

  const handleSettingsSubmit = useCallback(
    async (formValues: DynamicFieldValues) => {
      try {
        const res = await validateSettingsMutation.mutateAsync({
          details: connectionDetails
            ? convertToConnectionFieldValues(connectionDetails)
            : undefined,
          settings: convertToConnectionFieldValues(formValues),
        });

        if (res.data?.can_connect && res.data.connection_settings_valid) {
          irminAlert('success', dict.connections.create.configuration_valid);
          setConnectionSettings(formValues);
          goNext();
        } else {
          irminAlert('error', dict.connections.create.configuration_invalid);
        }
      } catch (error) {
        console.error('Test connection error:', error);
        irminAlert(
          'error',
          (error as Error)?.message ?? 'Failed to test connection'
        );
      }
    },
    [
      connectionDetails,
      validateSettingsMutation,
      irminAlert,
      setConnectionSettings,
      goNext,
      dict,
    ]
  );

  // Step 1: Select Connector
  if (connectionCreationStep === 1) {
    return (
      <div className='space-y-4'>
        {selectedConnector && (
          <div
            className={`
              flex flex-col justify-center border-b pb-4
              dark:border-gray-800
            `}
          >
            <p className='mb-2 text-sm opacity-80'>
              {dict.connections.create.selectedConnector}:
            </p>
            <ConnectorInfoSmall connector={selectedConnector} />
          </div>
        )}

        {/* Category Filter */}
        <div
          className={`
            flex w-full flex-wrap gap-2 border-b pb-4
            dark:border-gray-800
          `}
        >
          {categoryFilterOptions.map((category) => (
            <Button
              variant={category === activeCategory ? 'accent' : 'secondary'}
              key={`category-${category}`}
              onClick={() => setActiveCategory(category ?? '')}
              className='capitalize'
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Connector Selection */}
        <div className='flex flex-wrap gap-2'>
          {filteredConnectors.map((connector) => (
            <button
              type='button'
              className={`
                flex w-max max-w-[50%] cursor-pointer flex-row items-center
                justify-start gap-4 rounded-lg bg-gray-100 px-4 py-2 text-left
                text-sm text-foreground shadow transition-all
                hover:opacity-80
                dark:bg-gray-800 dark:text-gray-200
                ${
                  selectedConnector?.id === connector.id &&
                  `
                    outline outline-gray-800
                    dark:outline-gray-200
                  `
                }
              `}
              key={`connector-${connector.id}`}
              onClick={() => setSelectedConnector(connector)}
            >
              <Avatar className='size-12 rounded-none'>
                <AvatarImage src={connector.logo_url} alt={connector.name} />
                <AvatarFallback>
                  {connector.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className='flex flex-col justify-start gap-1'>
                {connector.primary_category && (
                  <Badge variant='secondary'>
                    {connector.primary_category}
                  </Badge>
                )}
                <p>{connector.name}</p>
              </div>
            </button>
          ))}
        </div>

        <Button
          className='w-full'
          size='lg'
          variant='default'
          onClick={handleConnectorSelect}
          disabled={!selectedConnector}
        >
          {dict.connections.create.confirmConnectorSelection}
        </Button>
      </div>
    );
  }

  // Step 2: Define Details
  if (connectionCreationStep === 2) {
    if (detailsQuery.isLoading) {
      return <ConnectionCreationSkeleton variant='form' />;
    }

    if (detailsQuery.isError) {
      return (
        <div>
          {dict.common.error}: {detailsQuery.error.message}
        </div>
      );
    }

    const formFields: DynamicFields = {
      irmin_connection_name: {
        type: 'text',
        label: dict.connections.create.connectionName,
        required: true,
        default: `${selectedConnector?.name ?? 'Connection'} ${Date.now()}`,
        example: dict.connections.create.connectionNamePlaceholder,
      },
      ...detailsQuery.data?.data,
    };

    return (
      <div className='space-y-6'>
        {selectedConnector && (
          <div
            className={`
              flex flex-col justify-center border-b pb-4
              dark:border-gray-800
            `}
          >
            <p className='mb-2 text-sm opacity-80'>
              {dict.connections.create.selectedConnector}:
            </p>
            <ConnectorInfoSmall connector={selectedConnector} />
          </div>
        )}

        <DynamicForm
          fields={formFields}
          onSubmit={handleDetailsSubmit}
          submitButtonText={dict.connections.create.continueAndTest}
          loading={validateDetailsMutation.isPending}
          formProps={{
            autoCapitalize: 'none',
            autoComplete: 'off',
            autoCorrect: 'off',
            autoSave: 'off',
            autoFocus: true,
          }}
        />

        <Button className='w-full' variant='ghost' size='sm' onClick={goBack}>
          {dict.connections.create.goBack}
        </Button>
      </div>
    );
  }

  // Step 3: Define Settings
  if (connectionCreationStep === 3) {
    if (settingsQuery.isLoading) {
      return <ConnectionCreationSkeleton variant='form' />;
    }

    if (settingsQuery.isError) {
      return (
        <div>
          {dict.common.error}: {settingsQuery.error.message}
        </div>
      );
    }

    return (
      <div className='space-y-6'>
        {selectedConnector && (
          <div
            className={`
              flex flex-col justify-center border-b pb-4
              dark:border-gray-800
            `}
          >
            <p className='mb-2 text-sm opacity-80'>
              {dict.connections.create.selectedConnector}:
            </p>
            <ConnectorInfoSmall connector={selectedConnector} />
          </div>
        )}

        <DynamicForm
          fields={settingsQuery.data?.data ?? {}}
          onSubmit={handleSettingsSubmit}
          submitButtonText={dict.connections.create.continue}
          loading={validateSettingsMutation.isPending}
          formProps={{
            autoCapitalize: 'none',
            autoComplete: 'off',
            autoCorrect: 'off',
            autoSave: 'off',
            autoFocus: true,
          }}
        />

        <Button className='w-full' variant='ghost' size='sm' onClick={goBack}>
          {dict.connections.create.goBack}
        </Button>
      </div>
    );
  }

  // Step 4: Configure Connection (Final Step)
  if (connectionCreationStep === 4) {
    const formFields: DynamicFields = {
      description: {
        type: 'textarea',
        label: dict.connections.create.connectionDescription,
        required: true,
        default: '',
        example: dict.connections.create.connectionDescriptionPlaceholder,
      },
    };

    return (
      <div className='space-y-6'>
        {selectedConnector && (
          <div
            className={`
              flex flex-col justify-center border-b pb-4
              dark:border-gray-800
            `}
          >
            <p className='mb-2 text-sm opacity-80'>
              {dict.connections.create.selectedConnector}:
            </p>
            <ConnectorInfoSmall connector={selectedConnector} />
          </div>
        )}

        <DynamicForm
          fields={formFields}
          onSubmit={handleCreateConnection}
          loading={createConnectionMutation.isPending}
          submitButtonText={dict.connections.create.createConnection}
          formProps={{
            autoCapitalize: 'none',
            autoComplete: 'off',
            autoCorrect: 'off',
            autoSave: 'off',
            autoFocus: true,
          }}
        />

        <Button className='w-full' variant='ghost' size='sm' onClick={goBack}>
          {dict.connections.create.goBack}
        </Button>
      </div>
    );
  }

  return null;
}
