'use client';

import { useCallback, useMemo, useState } from 'react';

import { TbHelp, TbSearch } from 'react-icons/tb';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConnectionCreationSkeleton } from '@/components/ui/loading/ConnectionCreationSkeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ConnectionWizard } from '@/components/wizards/ConnectionWizard';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';

import { useConnections } from '@/hooks/api';
import { useResourceAllowed } from '@/hooks/utils';

import type { Connection } from '@/types/core/Connection';

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
  const { connectionsQuery } = useConnections();
  const { isResourceAllowed } = useResourceAllowed();

  // Filter connections based on search
  const [searchQuery, setSearchQuery] = useState('');

  // Compute filtered connections using useMemo
  const filteredConnections = useMemo(() => {
    const connections = connectionsQuery.data?.data;
    if (!connections) return [];
    return connections.filter((connection) =>
      connection.name
        .trim()
        .replace(/\s+/g, '')
        .toLowerCase()
        .includes(searchQuery.trim().replace(/\s+/g, '').toLowerCase())
    );
  }, [connectionsQuery.data?.data, searchQuery]);

  // Connection wizard step state
  const [connectionWizardStep, setConnectionWizardStep] = useState(1);

  const handleContinue = useCallback(() => {
    if (!wizardData.connection) {
      irminAlert('error', dict.wizard.pleaseSelectConnection);
      return;
    }
    goNext();
  }, [wizardData.connection, irminAlert, goNext, dict]);

  const handleConnectionComplete = useCallback(
    (connection: Connection) => {
      updateWizardData({
        connection,
        createNewConnection: false,
        connectionData: {
          ...wizardData.connectionData,
          name: connection.name,
          description: connection.description,
        },
      });
      setConnectionWizardStep(1);
      goNext();
    },
    [updateWizardData, wizardData.connectionData, goNext]
  );

  if (connectionsQuery.isLoading) {
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
            // Prevent selecting 'new' if user doesn't have permission
            if (value === 'new' && !isResourceAllowed('connection', 'create')) {
              return;
            }
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
          <div
            className={
              'flex items-center space-x-2' +
              (!isResourceAllowed('connection', 'create') ? 'opacity-50' : '')
            }
          >
            <RadioGroupItem
              value='new'
              id='new'
              disabled={!isResourceAllowed('connection', 'create')}
            />
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
                  {!isResourceAllowed('connection', 'create')
                    ? dict.common.insufficientPermissions
                    : dict.wizard.setupNewConnectionToDataSource}
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
        // Embedded connection wizard
        <div className='space-y-4'>
          <ConnectionWizard
            closeModal={() => {}}
            currentStep={connectionWizardStep}
            setCurrentStep={setConnectionWizardStep}
            embedded={true}
            onComplete={handleConnectionComplete}
            onCancel={() => {
              setConnectionWizardStep(1);
              updateWizardData({ createNewConnection: false });
            }}
          />
        </div>
      )}

      {!wizardData.createNewConnection && (
        <>
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
              disabled={!wizardData.connection}
            >
              {dict.common.continue}
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
        </>
      )}
    </div>
  );
}
