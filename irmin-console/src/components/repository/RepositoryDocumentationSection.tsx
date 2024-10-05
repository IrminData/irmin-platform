'use client';

import { useCallback } from 'react';

import { TbFile } from 'react-icons/tb';

import Button from '@/components/common/button/Button';
import DocumentationForm, {
  DocumentationFormValues,
} from '@/components/common/form/DocumentationForm';

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

  const handleSaveDocumentation = useCallback(
    async (data: DocumentationFormValues) => {
      try {
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

export default RepositoryDocumentationSection;
