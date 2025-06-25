'use client';

import { Dispatch, SetStateAction, useCallback, useMemo } from 'react';

import SchemaFieldMapper from '@/components/SchemaFieldMapper';
import { getFilteredConnectionSchema } from '@/components/SchemaFieldMapper/utils';
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

  const {
    connection_id,
    connection_path = '',
    repository,
    repository_branch: ref,
  } = workflowData.workflowable as Import | Export;

  const operation = workflowData.type === 'import' ? 'read' : 'write';

  const { connectionSchemaQuery } = useConnectionSchema(
    connection_id,
    operation
  );

  const { repositoryObjectSchemaQuery } = useRepositoryObjectSchema(
    repository,
    ref
  );

  const connectionSchema = connectionSchemaQuery.data?.data;
  const repositorySchema = repositoryObjectSchemaQuery.data?.data;

  const sourceSchema = useMemo(() => {
    if (workflowData.type === 'import') {
      // For import workflows, source is connection schema filtered by connection_path
      return getFilteredConnectionSchema(connectionSchema, connection_path);
    } else {
      // For export workflows, source is repository schema
      return repositorySchema ?? null;
    }
  }, [workflowData.type, connectionSchema, repositorySchema, connection_path]);

  const destinationSchema = useMemo(() => {
    if (workflowData.type === 'import') {
      // For import workflows, destination is repository schema
      return repositorySchema ?? null;
    } else {
      // For export workflows, destination is connection schema filtered by connection_path
      return getFilteredConnectionSchema(connectionSchema, connection_path);
    }
  }, [workflowData.type, repositorySchema, connectionSchema, connection_path]);

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
