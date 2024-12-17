'use client';

import { useCallback } from 'react';

import { TbFile } from 'react-icons/tb';

import Button from '@/components/ui/button';
import DocumentationForm, {
  DocumentationFormValues,
} from '@/components/ui/form/DocumentationForm';

import { useConnection } from '@/context/ConnectionContext';
import { useLocale } from '@/context/LocaleContext';

/**
 * Connection Documentation section component for displaying and updating the documentation.
 */
const ConnectionDocumentationSection = () => {
  const { dict } = useLocale();
  const { connection, updateConnection } = useConnection();

  const handleSaveDocumentation = useCallback(
    async (data: DocumentationFormValues) => {
      await updateConnection({
        documentation: data.documentation,
      });
    },
    [updateConnection]
  );

  return (
    <DocumentationForm
      initialDocumentation={connection.documentation ?? ''}
      onSubmit={handleSaveDocumentation}
    >
      <Button size='sm' variant='default' type='submit' icon={<TbFile />}>
        {dict.repository.settings.saveChanges}
      </Button>
    </DocumentationForm>
  );
};

export default ConnectionDocumentationSection;
