'use client';

import { useCallback } from 'react';

import Button from '@/components/ui/button';
import DocumentationForm, {
  DocumentationFormValues,
} from '@/components/ui/form/DocumentationForm';

import { useLocale } from '@/context/LocaleContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import { useRepository } from '@/hooks/useRepository';
import { useResourceAllowed } from '@/hooks/useResourceAllowed';

import { PolicyAction, PolicyResource } from '@/types/core/Policy';

/**
 * Repository Documentation section component for displaying and updating the documentation.
 */
const RepositoryDocumentationSection = () => {
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
      disabled={
        !isResourceAllowed(
          PolicyResource.Repository,
          PolicyAction.Update,
          repository.id
        )
      }
    >
      <Button
        size='default'
        variant='default'
        type='submit'
        disabled={
          !isResourceAllowed(
            PolicyResource.Repository,
            PolicyAction.Update,
            repository.id
          )
        }
      >
        {dict.common.save}
      </Button>
    </DocumentationForm>
  );
};

export default RepositoryDocumentationSection;
