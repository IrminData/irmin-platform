'use client';

import { TbFile } from 'react-icons/tb';

import Button from '@/components/ui/Button';
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

  const handleSaveDocumentation = async (data: DocumentationFormValues) => {
    try {
      const documentation = data.documentation.trim();
      const res = await updateConnection(connection.id, {
        ...connection,
        documentation,
      });
      irminAlert(
        'success',
        res.message ?? dict.connections.settings.connectionUpdated
      );
    } catch (error) {
      irminAlert(
        'error',
        (error as Error)?.message ??
          dict.connections.settings.errorUpdatingConnection
      );
    }
  };

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
