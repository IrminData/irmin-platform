'use client';

import { useCallback, useRef } from 'react';

import { TbFile } from 'react-icons/tb';

import Button from '@/components/ui/button';
import DocumentationForm, {
  DocumentationFormValues,
} from '@/components/ui/form/DocumentationForm';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { Connection } from '@/types/core/Connection';

/**
 * Connection Documentation section component for displaying and updating the documentation.
 *
 * @param props - The props.
 * @param props.connection - The connection to show and edit the documentation for.
 */
const ConnectionDocumentationSection = ({
  connection,
}: {
  connection: Connection;
}) => {
  const { irminAlert } = usePopup();
  const { dict } = useLocale();
  const {
    connections: { updateConnection },
  } = useWorkspace();

  const saving = useRef(false);

  const handleSaveDocumentation = useCallback(
    async (data: DocumentationFormValues) => {
      if (saving.current) return;
      try {
        saving.current = true;
        const documentation = data.documentation.trim();
        const res = await updateConnection(connection.id, {
          ...connection,
          documentation,
        });
        irminAlert(
          'success',
          res.message ?? 'Connection documentation updated successfully'
        );
      } catch (error) {
        irminAlert(
          'error',
          (error as Error)?.message ??
            'Error updating the connection documentation'
        );
      } finally {
        saving.current = false;
      }
    },
    [connection, irminAlert, updateConnection]
  );

  return (
    <div className='mt-0 lg:-mt-2' id='connection-documentation-section'>
      <DocumentationForm
        initialDocumentation={connection.documentation ?? ''}
        onSubmit={handleSaveDocumentation}
      >
        <Button size='sm' variant='default' type='submit' icon={<TbFile />}>
          {dict.repository.settings.saveChanges}
        </Button>
      </DocumentationForm>
    </div>
  );
};

export default ConnectionDocumentationSection;
