'use client';

import { Dispatch, SetStateAction, useCallback, useMemo } from 'react';

import SchemaFieldMapper from '@/components/SchemaFieldMapper';
import { getFilteredSchema } from '@/components/SchemaFieldMapper/utils';
import Button from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useCreateWorkflow } from '@/context/CreateWorkflowContext';
import { useLocale } from '@/context/LocaleContext';

import { useConnectionSchema } from '@/hooks/useConnectionSchema';
import { useRepositoryObjectSchema } from '@/hooks/useRepositoryObjectSchema';

import { Export, FieldMapping, Import } from '@/types/core/Workflow';

interface ConfigureFieldMappingsProps {
  setCurrentStep: Dispatch<SetStateAction<number>>;
  closeModal: () => void;
}

function ConfigureFieldMappings({
  setCurrentStep,
}: ConfigureFieldMappingsProps) {
  const { dict } = useLocale();
  const { workflowData, setWorkflowData } = useCreateWorkflow();

  const workflowable = useMemo(() => {
    if (
      workflowData.workflowable?.type === 'import' ||
      workflowData.workflowable?.type === 'export'
    ) {
      return workflowData.workflowable;
    }
  }, [workflowData.workflowable]);

  const { connectionSchemaQuery } = useConnectionSchema(
    workflowable?.connection_id ?? '',
    workflowable?.type === 'import' ? 'read' : 'write'
  );

  const { repositoryObjectSchemaQuery } = useRepositoryObjectSchema(
    workflowable?.repository ?? '',
    workflowable?.repository_branch ?? ''
  );

  const connectionSchema = connectionSchemaQuery.data?.data;
  const repositorySchema = repositoryObjectSchemaQuery.data?.data;

  const sourceSchema = useMemo(() => {
    if (workflowData.workflowable?.type === 'import') {
      // For import workflows, source is connection schema filtered by connection_path
      return getFilteredSchema(
        connectionSchema,
        workflowData.workflowable.import_from_connection_paths
      );
    } else if (workflowData.workflowable?.type === 'export') {
      // For export workflows, source is repository schema
      return getFilteredSchema(
        repositorySchema,
        workflowData.workflowable.export_from_repository_paths
      );
    }
  }, [workflowData.workflowable, connectionSchema, repositorySchema]);

  const destinationSchema = useMemo(() => {
    if (workflowData.workflowable?.type === 'import') {
      // For import workflows, destination is repository schema
      return getFilteredSchema(repositorySchema, [
        workflowData.workflowable.import_to_repository_path,
      ]);
    } else if (workflowData.workflowable?.type === 'export') {
      // For export workflows, destination is connection schema filtered by connection_path
      return getFilteredSchema(connectionSchema, [
        workflowData.workflowable.export_to_connection_path,
      ]);
    }
  }, [workflowData.workflowable, connectionSchema, repositorySchema]);

  const isLoading =
    connectionSchemaQuery.isLoading || repositoryObjectSchemaQuery.isLoading;

  const handleMappingsChange = useCallback(
    (newMappings: FieldMapping[]) => {
      if (!workflowData.workflowable) return;

      setWorkflowData((prev) => ({
        ...prev,
        workflowable: {
          ...(prev.workflowable as Import | Export),
          field_mappings: newMappings,
        },
      }));
    },
    [workflowData.workflowable, setWorkflowData]
  );

  const handleContinue = useCallback(() => {
    setCurrentStep(3);
  }, [setCurrentStep]);

  const handleGoBack = useCallback(() => {
    setCurrentStep(1);
  }, [setCurrentStep]);

  if (isLoading) {
    return <LoadingSkeleton className='h-80 w-full' />;
  }

  return (
    <div className='flex w-full flex-col px-4 py-6'>
      <SchemaFieldMapper
        onMappingsChange={handleMappingsChange}
        sourceSchema={sourceSchema ?? null}
        destinationSchema={destinationSchema ?? null}
      />
      <div className='grow'></div>
      <div className='mt-auto border-t pt-4 dark:border-gray-800'>
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

export default ConfigureFieldMappings;
