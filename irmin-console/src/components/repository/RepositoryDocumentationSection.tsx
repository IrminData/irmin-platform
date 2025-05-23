'use client';

import { useCallback } from 'react';

import Button from '@/components/ui/button';
import DocumentationForm, {
  DocumentationFormValues,
} from '@/components/ui/form/DocumentationForm';

import { useLocale } from '@/context/LocaleContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import { useRepository } from '@/hooks/useRepository';

/**
 * Repository Documentation section component for displaying and updating the documentation.
 */
const RepositoryDocumentationSection = () => {
  const { dict } = useLocale();
  const { repository } = useRepositoryContext();
  const { updateRepositoryMutation } = useRepository(repository.slug);

  const handleSaveDocumentation = useCallback(
    async (data: DocumentationFormValues) => {
      await updateRepositoryMutation.mutateAsync({
        documentation: data.documentation,
      });
    },
    [updateRepositoryMutation]
  );

  return (
    <DocumentationForm
      initialDocumentation={repository.documentation ?? ''}
      onSubmit={handleSaveDocumentation}
    >
      <Button size='default' variant='default' type='submit'>
        {dict.common.save}
      </Button>
    </DocumentationForm>
  );
};

export default RepositoryDocumentationSection;
