'use client';

import { TbFile } from 'react-icons/tb';

import Button from '@/components/common/button/Button';
import DocumentationForm, {
  DocumentationFormValues,
} from '@/components/common/form/DocumentationForm';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Workflow } from '@/types/core/Workflow';

/**
 * Workflow Documentation section component for displaying and updating the documentation.
 *
 * @param props - The props.
 * @param props.workflow - The workflow to show and edit the documentation for.
 */
const WorkflowDocumentationSection = ({ workflow }: { workflow: Workflow }) => {
  const { irminAlert } = usePopup();
  const { dict } = useLocale();
  const {
    workflows: { updateWorkflow },
  } = useWorkspace();

  /**
   * Handles saving the documentation for the workflow.
   * Uses {@link updateWorkflow} to update the workflow details.
   * Shows {@link irminAlert} on success or error.
   */
  const handleSaveDocumentation = async (data: DocumentationFormValues) => {
    try {
      const documentation = data.documentation.trim();
      const res = await updateWorkflow(workflow.id, {
        ...workflow,
        documentation,
      });
      irminAlert(
        'success',
        res.message ?? dict.workflow.settings.workflowUpdated
      );
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.workflow.settings.errorUpdatingWorkflow
      );
    }
  };

  return (
    <div className='mt-0 lg:-mt-6' id='workflow-documentation-section'>
      <DocumentationForm
        initialDocumentation={workflow.documentation ?? ''}
        onSubmit={handleSaveDocumentation}
      >
        <Button
          size='sm'
          colorScheme='primary'
          variant='solid'
          type='submit'
          icon={<TbFile />}
        >
          {dict.repository.settings.saveChanges}
        </Button>
      </DocumentationForm>
    </div>
  );
};

export default WorkflowDocumentationSection;
