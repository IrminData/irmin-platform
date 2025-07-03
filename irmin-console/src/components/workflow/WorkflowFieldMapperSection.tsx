'use client';

import { useCallback, useMemo, useState } from 'react';

import SchemaFieldMapper from '@/components/SchemaFieldMapper';
import { getFilteredSchema } from '@/components/SchemaFieldMapper/utils';
import Button from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { useConnectionSchema } from '@/hooks/useConnectionSchema';
import { useRepositoryObjectSchema } from '@/hooks/useRepositoryObjectSchema';
import { useResourceAllowed } from '@/hooks/useResourceAllowed';
import { useWorkflow } from '@/hooks/useWorkflow';

import { PolicyAction, PolicyResource } from '@/types/core/Policy';
import {
  ExportWorkflow,
  FieldMapping,
  ImportWorkflow,
} from '@/types/core/Workflow';

const WorkflowFieldMapperSection = ({ workflowID }: { workflowID: string }) => {
  const { dict } = useLocale();
  const { workflowQuery, updateWorkflowableMutation } = useWorkflow(workflowID);
  const { isResourceAllowed } = useResourceAllowed();

  const workflow = workflowQuery.data?.data as
    | ImportWorkflow
    | ExportWorkflow
    | undefined;

  const [mappings, setMappings] = useState<FieldMapping[]>(
    workflow?.workflowable?.field_mappings ?? []
  );

  const workflowable = useMemo(() => {
    if (
      workflow?.workflowable?.type === 'import' ||
      workflow?.workflowable?.type === 'export'
    ) {
      return workflow.workflowable;
    }
  }, [workflow?.workflowable]);

  const { connectionSchemaQuery } = useConnectionSchema(
    workflowable?.connection_id ?? '',
    workflowable?.type === 'import' ? 'read' : 'write'
  );

  const { repositoryObjectSchemaQuery } = useRepositoryObjectSchema(
    workflowable?.repository ?? '',
    workflowable?.repository_branch ?? ''
  );

  const isAllowed = useMemo(
    () =>
      isResourceAllowed(
        PolicyResource.Workflow,
        PolicyAction.Update,
        workflowID
      ),
    [isResourceAllowed, workflowID]
  );

  const handleSave = useCallback(() => {
    if (!workflow?.workflowable) return;
    updateWorkflowableMutation.mutate({
      ...workflow.workflowable,
      field_mappings: mappings,
    });
  }, [workflow?.workflowable, mappings, updateWorkflowableMutation]);

  const handleReset = useCallback(() => {
    setMappings(workflow?.workflowable?.field_mappings ?? []);
  }, [workflow?.workflowable?.field_mappings]);

  const isDirty = useMemo(
    () =>
      JSON.stringify(mappings) !==
      JSON.stringify(workflow?.workflowable?.field_mappings ?? []),
    [mappings, workflow?.workflowable?.field_mappings]
  );

  const connectionSchema = connectionSchemaQuery.data?.data;
  const repositorySchema = repositoryObjectSchemaQuery.data?.data;

  const sourceSchema = useMemo(() => {
    if (workflowable?.type === 'import') {
      // For import workflows, source is connection schema filtered by connection paths
      return getFilteredSchema(
        connectionSchema,
        workflowable.import_from_connection_paths
      );
    } else if (workflowable?.type === 'export') {
      // For export workflows, source is repository schema
      return getFilteredSchema(
        repositorySchema,
        workflowable.export_from_repository_paths
      );
    }
  }, [workflowable, connectionSchema, repositorySchema]);

  const destinationSchema = useMemo(() => {
    if (workflowable?.type === 'import') {
      // For import workflows, destination is repository schema
      return getFilteredSchema(repositorySchema, [
        workflowable.import_to_repository_path,
      ]);
    } else if (workflowable?.type === 'export') {
      // For export workflows, destination is connection schema filtered by connection path
      return getFilteredSchema(connectionSchema, [
        workflowable.export_to_connection_path,
      ]);
    }
  }, [workflowable, connectionSchema, repositorySchema]);

  if (
    workflowQuery.isLoading ||
    connectionSchemaQuery.isLoading ||
    repositoryObjectSchemaQuery.isLoading
  ) {
    return (
      <div className='mx-auto flex max-w-7xl flex-col gap-2 py-2'>
        <LoadingSkeleton />
      </div>
    );
  }

  if (workflowQuery.isError) {
    return <div>Error: {workflowQuery.error.message}</div>;
  }

  if (
    !workflow ||
    !isAllowed ||
    (workflow.type !== 'import' && workflow.type !== 'export')
  ) {
    return <></>;
  }

  return (
    <div className='mx-auto max-w-7xl p-4'>
      <div className='flex justify-end gap-2 border-b pb-4 dark:border-gray-800'>
        <Button
          onClick={handleReset}
          variant='outline'
          disabled={!isDirty || updateWorkflowableMutation.isPending}
        >
          {dict.common.resetForm}
        </Button>
        <Button
          onClick={handleSave}
          disabled={!isDirty || updateWorkflowableMutation.isPending}
          loading={updateWorkflowableMutation.isPending}
        >
          {dict.common.save}
        </Button>
      </div>
      <SchemaFieldMapper
        initialMappings={mappings}
        onMappingsChange={setMappings}
        sourceSchema={sourceSchema ?? null}
        destinationSchema={destinationSchema ?? null}
      />
    </div>
  );
};

export default WorkflowFieldMapperSection;
