'use client';

import { useCallback } from 'react';

import { TbFile } from 'react-icons/tb';

import Button from '@/components/ui/button';
import DocumentationForm, {
  DocumentationFormValues,
} from '@/components/ui/form/DocumentationForm';

import { useLocale } from '@/context/LocaleContext';
import { useRepository } from '@/context/RepositoryContext';

/**
 * Repository Documentation section component for displaying and updating the documentation.
 */
const RepositoryDocumentationSection = () => {
  const { dict } = useLocale();
  const { currentRepository, updateRepository } = useRepository();

  const handleSaveDocumentation = useCallback(
    async (data: DocumentationFormValues) => {
      await updateRepository({
        documentation: data.documentation,
      });
    },
    [updateRepository]
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
