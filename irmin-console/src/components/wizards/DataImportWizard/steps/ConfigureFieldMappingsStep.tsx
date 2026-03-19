'use client';

import { useCallback, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import SchemaFieldMapper from '@/components/workflow/SchemaFieldMapper';
import { getFilteredSchema } from '@/components/workflow/SchemaFieldMapper/utils';

import { useLocale } from '@/context/LocaleContext';

import { useConnectionSchema, useRepositoryObjectSchema } from '@/hooks/api';

import type { FieldMapping } from '@/types/core/Workflow';

import type { DataImportWizardData } from '../types';

/**
 * Step 4: Configure Field Mappings
 *
 * Users configure field mappings between source connection and destination repository
 */
export default function ConfigureFieldMappingsStep({
  wizardData,
  updateWizardData,
  goBack,
  goNext,
}: {
  wizardData: DataImportWizardData;
  updateWizardData: (updates: Partial<DataImportWizardData>) => void;
  goBack: () => void;
  goNext: () => void;
}) {
  const { dict } = useLocale();

  // Get connection ID - either from existing connection or we'll need to create one
  const connectionId = wizardData.createNewConnection
    ? '' // We'll need to handle this case differently
    : (wizardData.connection?.id ?? '');

  // Only fetch schemas if we have the required IDs
  const shouldFetchConnectionSchema =
    !wizardData.createNewConnection && connectionId;
  const shouldFetchRepositorySchema =
    !wizardData.createNewRepository && wizardData.repository?.slug;

  const { connectionSchemaQuery } = useConnectionSchema(
    connectionId,
    'pull', // For import workflows, we read from connection, so operation method is "pull"
    wizardData.workflowData.import_from_connection_paths // Fetch schemas only for the selected paths
  );

  const { repositoryObjectSchemaQuery } = useRepositoryObjectSchema(
    wizardData.createNewRepository
      ? '' // We'll need to handle this case differently
      : (wizardData.repository?.slug ?? ''),
    wizardData.workflowData.repository_branch
  );

  const connectionSchema = connectionSchemaQuery.data?.data;
  const repositorySchema = repositoryObjectSchemaQuery.data?.data;

  const sourceSchema = useMemo(() => {
    // For import workflows, source is connection schema filtered by connection_path
    return getFilteredSchema(
      connectionSchema,
      wizardData.workflowData.import_from_connection_paths
    );
  }, [connectionSchema, wizardData.workflowData.import_from_connection_paths]);

  const destinationSchema = useMemo(() => {
    // For import workflows, destination is repository schema
    return getFilteredSchema(repositorySchema, [
      wizardData.workflowData.import_to_repository_path,
    ]);
  }, [repositorySchema, wizardData.workflowData.import_to_repository_path]);

  const isLoading =
    connectionSchemaQuery.isLoading || repositoryObjectSchemaQuery.isLoading;

  const handleMappingsChange = useCallback(
    (newMappings: FieldMapping[]) => {
      updateWizardData({
        workflowData: {
          ...wizardData.workflowData,
          field_mappings: newMappings,
        },
      });
    },
    [wizardData.workflowData, updateWizardData]
  );

  const handleContinue = useCallback(() => {
    goNext();
  }, [goNext]);

  const handleGoBack = useCallback(() => {
    goBack();
  }, [goBack]);

  // Show loading state if we don't have the required data yet
  if (isLoading) {
    return <LoadingSkeleton className='h-80 w-full' />;
  }

  // If we don't have the required schemas, show a message and allow skipping
  if (!shouldFetchConnectionSchema || !shouldFetchRepositorySchema) {
    return (
      <div className='flex w-full flex-col px-4 py-6'>
        <div className='mb-6'>
          <h3 className='mb-2 text-lg font-semibold'>
            {dict.schemaFieldMapper.fieldMappings}
          </h3>
          <p
            className={`
              text-sm text-gray-600
              dark:text-gray-400
            `}
          >
            {dict.wizard.fieldMappingsDescription}
          </p>
        </div>

        <div
          className={`
            rounded-lg border border-gray-200 p-8 text-center
            dark:border-gray-700
          `}
        >
          <p
            className={`
              text-sm text-gray-600
              dark:text-gray-400
            `}
          >
            {wizardData.createNewConnection || wizardData.createNewRepository
              ? dict.wizard.fieldMappingsNotAvailableNewResources
              : dict.wizard.fieldMappingsNotAvailable}
          </p>
        </div>

        <div className='grow' />
        <div
          className={`
            mt-auto border-t pt-4
            dark:border-gray-800
          `}
        >
          <Button
            className='mb-6 inline-block w-full'
            variant='gradient'
            size={'lg'}
            onClick={handleContinue}
          >
            {dict.common.continue}
          </Button>
          <Button
            className='mb-6 inline-block w-full'
            variant='link'
            size='sm'
            onClick={handleGoBack}
          >
            {dict.common.back}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='flex w-full flex-col px-4 py-6'>
      <div className='mb-6'>
        <h3 className='mb-2 text-lg font-semibold'>
          {dict.schemaFieldMapper.fieldMappings}
        </h3>
        <p
          className={`
            text-sm text-gray-600
            dark:text-gray-400
          `}
        >
          {dict.wizard.fieldMappingsDescription}
        </p>
      </div>

      <SchemaFieldMapper
        initialMappings={wizardData.workflowData.field_mappings}
        onMappingsChange={handleMappingsChange}
        sourceSchema={sourceSchema ?? null}
        destinationSchema={destinationSchema ?? null}
        showEmptyState={true}
      />

      <div className='grow' />
      <div
        className={`
          flex gap-3 border-t pt-4
          dark:border-gray-800
        `}
      >
        <Button
          variant='secondary'
          onClick={handleGoBack}
          className='flex-1'
          size='lg'
        >
          {dict.common.back}
        </Button>
        <Button
          className='flex-1'
          size='lg'
          variant='default'
          onClick={handleContinue}
        >
          {dict.common.continue}
        </Button>
      </div>
    </div>
  );
}
