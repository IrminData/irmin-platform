'use client';

import { useCallback, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import SchemaFieldMapper from '@/components/workflow/SchemaFieldMapper';
import { getFilteredSchema } from '@/components/workflow/SchemaFieldMapper/utils';

import { useLocale } from '@/context/LocaleContext';

import { useConnectionSchema, useRepositoryObjectSchema } from '@/hooks/api';

import type { Export, FieldMapping, Import } from '@/types/core/Workflow';

import type { WorkflowWizardData } from '../types';

/**
 * Step component for configuring field mappings
 */
function ConfigureFieldMappingsStep({
  wizardData,
  updateWizardData,
  goBack,
  goNext,
}: {
  wizardData: WorkflowWizardData;
  updateWizardData: (updates: Partial<WorkflowWizardData>) => void;
  goBack: () => void;
  goNext: () => void;
}) {
  const { dict } = useLocale();

  const workflowable = useMemo(() => {
    if (
      wizardData.workflowable?.type === 'import' ||
      wizardData.workflowable?.type === 'export'
    ) {
      return wizardData.workflowable;
    }
  }, [wizardData.workflowable]);

  const { connectionSchemaQuery } = useConnectionSchema(
    workflowable?.connection_id ?? '',
    workflowable?.type === 'import' ? 'pull' : 'push', // For import workflows, we read from connection, so operation method is "pull", for export workflows, we write to connection, so operation method is "push"
    workflowable?.type === 'import'
      ? workflowable.import_from_connection_paths
      : workflowable?.type === 'export'
        ? [workflowable.export_to_connection_path]
        : undefined
  );

  const { repositoryObjectSchemaQuery } = useRepositoryObjectSchema(
    workflowable?.repository ?? '',
    workflowable?.repository_branch ?? ''
  );

  const connectionSchema = connectionSchemaQuery.data?.data;
  const repositorySchema = repositoryObjectSchemaQuery.data?.data;

  const sourceSchema = useMemo(() => {
    if (wizardData.workflowable?.type === 'import') {
      // For import workflows, source is connection schema filtered by connection_path
      return getFilteredSchema(
        connectionSchema,
        wizardData.workflowable.import_from_connection_paths
      );
    } else if (wizardData.workflowable?.type === 'export') {
      // For export workflows, source is repository schema
      return getFilteredSchema(
        repositorySchema,
        wizardData.workflowable.export_from_repository_paths
      );
    }
  }, [wizardData.workflowable, connectionSchema, repositorySchema]);

  const destinationSchema = useMemo(() => {
    if (wizardData.workflowable?.type === 'import') {
      // For import workflows, destination is repository schema
      return getFilteredSchema(repositorySchema, [
        wizardData.workflowable.import_to_repository_path,
      ]);
    } else if (wizardData.workflowable?.type === 'export') {
      // For export workflows, destination is connection schema filtered by connection_path
      return getFilteredSchema(connectionSchema, [
        wizardData.workflowable.export_to_connection_path,
      ]);
    }
  }, [wizardData.workflowable, connectionSchema, repositorySchema]);

  const isLoading =
    connectionSchemaQuery.isLoading || repositoryObjectSchemaQuery.isLoading;

  const handleMappingsChange = useCallback(
    (newMappings: FieldMapping[]) => {
      if (!wizardData.workflowable) return;

      updateWizardData({
        workflowable: {
          ...(wizardData.workflowable as Export | Import),
          field_mappings: newMappings,
        },
      });
    },
    [wizardData.workflowable, updateWizardData]
  );

  const handleContinue = useCallback(() => {
    goNext();
  }, [goNext]);

  const handleGoBack = useCallback(() => {
    goBack();
  }, [goBack]);

  if (isLoading) {
    return <LoadingSkeleton className='h-80 w-full' />;
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
        onMappingsChange={handleMappingsChange}
        sourceSchema={sourceSchema ?? null}
        destinationSchema={destinationSchema ?? null}
        showEmptyState={true}
      />
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
          {dict.workflow.create.confirmAndContinue}
        </Button>
        <Button
          className='mb-6 inline-block w-full'
          variant='link'
          size='sm'
          onClick={handleGoBack}
        >
          {dict.workflow.create.goBack}
        </Button>
      </div>
    </div>
  );
}

export default ConfigureFieldMappingsStep;
