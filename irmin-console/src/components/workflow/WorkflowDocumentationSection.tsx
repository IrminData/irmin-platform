'use client';

import { useCallback } from 'react';

import { TbFile } from 'react-icons/tb';

import Button from '@/components/ui/button';
import DocumentationForm, {
  DocumentationFormValues,
} from '@/components/ui/form/DocumentationForm';

import { useLocale } from '@/context/LocaleContext';
import { useWorkflow } from '@/context/WorkflowContext';

/**
 * Workflow Documentation section component for displaying and updating the documentation.
 */
const WorkflowDocumentationSection = () => {
  const { dict } = useLocale();
  const { workflow, updateWorkflow } = useWorkflow();

  const handleSaveDocumentation = useCallback(
    async (data: DocumentationFormValues) => {
      await updateWorkflow({
        documentation: data.documentation,
      });
    },
    [updateWorkflow]
  );

  return (
    <DocumentationForm
      initialDocumentation={workflow.documentation ?? ''}
      onSubmit={handleSaveDocumentation}
    >
      <Button size='sm' variant='default' type='submit' icon={<TbFile />}>
        {dict.repository.settings.saveChanges}
      </Button>
    </DocumentationForm>
  );
};

export default WorkflowDocumentationSection;
