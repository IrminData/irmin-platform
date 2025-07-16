'use client';

import { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import SafeComponent from '@/components/ui/error/SafeComponent';
import type { DocumentationFormValues } from '@/components/ui/form/DocumentationForm';
import DocumentationForm from '@/components/ui/form/DocumentationForm';

import { useLocale } from '@/context/LocaleContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import { useRepository } from '@/hooks/api';
import { useResourceAllowed } from '@/hooks/utils';

/**
 * Repository Documentation section component for displaying and updating the documentation.
 */
const RepositoryDocumentationSection = () => {
  return (
    <SafeComponent
      level='section'
      title='Repository Documentation Error'
      description='The repository documentation section encountered an error. Please try refreshing the page.'
    >
      <RepositoryDocumentationSectionContent />
    </SafeComponent>
  );
};

const RepositoryDocumentationSectionContent = () => {
  const { dict } = useLocale();
  const { repository } = useRepositoryContext();
  const { updateRepositoryMutation } = useRepository(repository.slug);
  const { isResourceAllowed } = useResourceAllowed();

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
      disabled={!isResourceAllowed('repository', 'update', repository.id)}
    >
      <Button
        size='default'
        variant='default'
        type='submit'
        disabled={!isResourceAllowed('repository', 'update', repository.id)}
      >
        {dict.common.save}
      </Button>
    </DocumentationForm>
  );
};

export default RepositoryDocumentationSection;
