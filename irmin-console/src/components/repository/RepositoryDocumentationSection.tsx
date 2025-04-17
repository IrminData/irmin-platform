'use client';

import { useCallback } from 'react';

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
    <DocumentationForm
      initialDocumentation={currentRepository.documentation ?? ''}
      onSubmit={handleSaveDocumentation}
    >
      <Button size='default' variant='default' type='submit'>
        {dict.common.save}
      </Button>
    </DocumentationForm>
  );
};

export default RepositoryDocumentationSection;
