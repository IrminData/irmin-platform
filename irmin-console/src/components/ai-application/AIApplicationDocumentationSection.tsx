'use client';

import { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import SafeComponent from '@/components/ui/error/SafeComponent';
import type { DocumentationFormValues } from '@/components/ui/form/DocumentationForm';
import DocumentationForm from '@/components/ui/form/DocumentationForm';

import { useAIApplicationContext } from '@/context/AIApplicationContext';
import { useLocale } from '@/context/LocaleContext';

import { useAIApplication } from '@/hooks/api/useAIApplications';
import { useResourceAllowed } from '@/hooks/utils';

/**
 * AI Application Documentation section component for displaying and updating the documentation.
 */
const AIApplicationDocumentationSection = () => {
  return (
    <SafeComponent
      level='section'
      title='AI Application Documentation Error'
      description='The AI Application documentation section encountered an error. Please try refreshing the page.'
    >
      <AIApplicationDocumentationSectionContent />
    </SafeComponent>
  );
};

const AIApplicationDocumentationSectionContent = () => {
  const { dict } = useLocale();
  const { aiApplication } = useAIApplicationContext();
  const { updateAIApplicationMutation } = useAIApplication(aiApplication.id);
  const { isResourceAllowed } = useResourceAllowed();

  const handleSaveDocumentation = useCallback(
    async (data: DocumentationFormValues) => {
      await updateAIApplicationMutation.mutateAsync({
        documentation: data.documentation,
      });
    },
    [updateAIApplicationMutation]
  );

  return (
    <DocumentationForm
      initialDocumentation={aiApplication.documentation ?? ''}
      onSubmit={handleSaveDocumentation}
      disabled={
        !isResourceAllowed('ai_application', 'update', aiApplication.id)
      }
    >
      <Button
        size='default'
        variant='default'
        type='submit'
        disabled={
          !isResourceAllowed('ai_application', 'update', aiApplication.id)
        }
      >
        {dict.common.save}
      </Button>
    </DocumentationForm>
  );
};

export default AIApplicationDocumentationSection;
