'use client';

import { useCallback, useRef } from 'react';

import { TbFile } from 'react-icons/tb';

import Button from '@/components/ui/button';
import DocumentationForm, {
  DocumentationFormValues,
} from '@/components/ui/form/DocumentationForm';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepository } from '@/context/RepositoryContext';
import { useWorkspace } from '@/context/workspace';

/**
 * Repository Documentation section component for displaying and updating the documentation.
 */
const RepositoryDocumentationSection = () => {
  const { irminAlert } = usePopup();
  const { dict } = useLocale();
  const { currentRepository } = useRepository();
  const {
    repositories: { updateRepository },
  } = useWorkspace();

  const saving = useRef(false);

  const handleSaveDocumentation = useCallback(
    async (data: DocumentationFormValues) => {
      if (saving.current) return;
      try {
        saving.current = true;
        const documentation = data.documentation.trim();
        const res = await updateRepository(currentRepository.slug, {
          ...currentRepository,
          documentation,
        });
        irminAlert(
          'success',
          res.message ?? 'Repository documentation updated successfully'
        );
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ??
            'Failed to update the repository documentation'
        );
      } finally {
        saving.current = false;
      }
    },
    [currentRepository, updateRepository, irminAlert]
  );

  return (
    <div className='mt-0 lg:-mt-6' id='repository-documentation-section'>
      <DocumentationForm
        initialDocumentation={currentRepository.documentation ?? ''}
        onSubmit={handleSaveDocumentation}
      >
        <Button size='sm' variant='default' type='submit' icon={<TbFile />}>
          {dict.repository.settings.saveChanges}
        </Button>
      </DocumentationForm>
    </div>
  );
};

export default RepositoryDocumentationSection;
