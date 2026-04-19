'use client';

import { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { QueryError } from '@/components/ui/error/QueryError';
import type { DocumentationFormValues } from '@/components/ui/form/DocumentationForm';
import DocumentationForm from '@/components/ui/form/DocumentationForm';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { useWorkflow } from '@/hooks/api';
import { useResourceAllowed } from '@/hooks/utils';

/**
 * Workflow Documentation section component for displaying and updating the documentation.
 */
const WorkflowDocumentationSection = ({
  workflowID,
}: {
  workflowID: string;
}) => {
  const { dict } = useLocale();
  const { workflowQuery, updateWorkflowMutation } = useWorkflow(workflowID);
  const { isResourceAllowed } = useResourceAllowed();

  const handleSaveDocumentation = useCallback(
    async (data: DocumentationFormValues) => {
      await updateWorkflowMutation.mutateAsync({
        name: workflowQuery.data?.data?.name ?? '',
        description: workflowQuery.data?.data?.description ?? '',
        documentation: data.documentation,
      });
    },
    [workflowQuery, updateWorkflowMutation]
  );

  if (workflowQuery.isLoading) {
    return (
      <div className='mx-auto flex max-w-7xl flex-col gap-2 py-2'>
        <LoadingSkeleton />
      </div>
    );
  }

  if (workflowQuery.isError) {
    return (
      <QueryError
        error={workflowQuery.error}
        onRetry={() => workflowQuery.refetch()}
        title={dict.common.errors.failedToLoadWorkflow}
        description={dict.common.errors.failedToLoadAgain}
      />
    );
  }

  if (!workflowQuery.data?.data) {
    return <></>;
  }

  const workflow = workflowQuery.data.data;

  return (
    <DocumentationForm
      initialDocumentation={workflow.documentation ?? ''}
      onSubmit={handleSaveDocumentation}
      disabled={!isResourceAllowed('workflow', 'update', workflowID)}
    >
      <Button
        size='sm'
        variant='default'
        type='submit'
        disabled={!isResourceAllowed('workflow', 'update', workflowID)}
      >
        {dict.common.save}
      </Button>
    </DocumentationForm>
  );
};

export default WorkflowDocumentationSection;
