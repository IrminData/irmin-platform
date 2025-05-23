'use client';

import { useCallback } from 'react';

import Button from '@/components/ui/button';
import DocumentationForm, {
  DocumentationFormValues,
} from '@/components/ui/form/DocumentationForm';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';

import { useWorkflow } from '@/hooks/useWorkflow';

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
    return <LoadingSkeleton className='h-80 w-full' />;
  }

  if (workflowQuery.isError) {
    return <div>Error: {workflowQuery.error.message}</div>;
  }

  if (!workflowQuery.data?.data) {
    return <div>No data</div>;
  }

  const workflow = workflowQuery.data.data;

  return (
    <DocumentationForm
      initialDocumentation={workflow.documentation ?? ''}
      onSubmit={handleSaveDocumentation}
    >
      <Button size='sm' variant='default' type='submit'>
        {dict.common.save}
      </Button>
    </DocumentationForm>
  );
};

export default WorkflowDocumentationSection;
