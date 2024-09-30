import { useMemo, useState } from 'react';

import IrminCore from '@/services/core/IrminCore';

import { TbRun, TbTrash } from 'react-icons/tb';

import { useData } from '@/context/DataContext';
import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useWorkspace } from '@/context/workspace';

import { RepositoryCollection } from '@/types/core/Collection';
import { FileSchema } from '@/types/core/FileCollection';
import { FolderSchema } from '@/types/core/FolderCollection';
import { StreamSchema } from '@/types/core/StreamCollection';
import { TableSchema } from '@/types/core/TableCollection';

import Button from '../common/button/Button';
import FileCollectionSchema from './FileCollectionSchema';
import FolderCollectionSchema from './FolderCollectionSchema';
import StreamCollectionSchema from './StreamCollectionSchema';
import TableCollectionSchema from './TableCollectionSchema';

/**
 * Component for displaying the schema of a collection.
 *
 * @param props - The component props
 * @param props.name - The name of the collection
 * @param props.collection - The collection to display the schema for
 * @param props.immutable - Whether the repository is immutable
 */
export default function CollectionSchema({
  name,
  collection,
  immutable,
}: {
  name: string;
  collection: RepositoryCollection;
  immutable?: boolean;
}) {
  const { dict, locale } = useLocale();
  const { irminAlert, irminConfirm } = usePopup();
  const {
    workspaces: { currentWorkspace },
    workflows: { allWorkflows },
  } = useWorkspace();
  const { currentRepository, currentBranch } = useData();

  const [processingDelete, setProcessingDelete] = useState(false);

  const { repositoryService } = useMemo(() => new IrminCore(locale), [locale]);

  const typeScpecificLabel = () => {
    if (collection.type === 'table') {
      return dict.repository.schema.table;
    }
    if (collection.type === 'folder') {
      return dict.repository.schema.folder;
    }
    if (collection.type === 'file') {
      return dict.repository.schema.file;
    }
    if (collection.type === 'stream') {
      return dict.repository.schema.stream;
    }
    return collection.type;
  };

  const matchedWorkflow = allWorkflows.find(
    (workflow) => workflow.id === collection.workflow
  );
  const downloadUrl = `/${locale}/console/${currentWorkspace?.slug}/repositories/${currentRepository}/download?collection=${collection.name}`;

  // Handle delete collection from the repository
  const handleDeleteCollection = () => {
    // Make sure this is not an immutable repository and we have the required data
    if (!currentRepository || !currentBranch || immutable) return;
    // Confirm the delete action
    irminConfirm(
      'warning',
      dict.repository.delete.confirm,
      async (confirmed) => {
        // Make sure the user confirmed the delete action
        if (!confirmed) return;
        // Make sure we are not already processing a delete action
        if (processingDelete) return;
        setProcessingDelete(true);
        try {
          // Upload the collection
          await repositoryService.deleteCollection(
            currentRepository,
            currentBranch,
            collection.name
          );
          // Show success message
          irminAlert('success', dict.repository.delete.success);
        } catch (error) {
          console.error('Failed to delete the collection:', error);
          irminAlert(
            'error',
            (error as Error)?.message ?? dict.repository.delete.failed
          );
        } finally {
          setProcessingDelete(false);
        }
      }
    );
  };

  return (
    <div className='flex w-max min-w-72 flex-col overflow-scroll rounded-md border border-gray-100 bg-white text-xs dark:border-gray-800 dark:bg-irmin_black'>
      <div className='bg-gray-100 px-4 py-2 text-sm font-semibold dark:bg-gray-800'>
        {typeScpecificLabel()} {`"${name}"`}
      </div>
      <div className='p-2'>
        {collection.type === 'table' && (
          <TableCollectionSchema
            schema={collection.schema as TableSchema}
            downloadUrl={downloadUrl}
          />
        )}
        {collection.type === 'folder' && (
          <FolderCollectionSchema
            schema={collection.schema as FolderSchema}
            downloadUrl={downloadUrl}
          />
        )}
        {collection.type === 'file' && (
          <FileCollectionSchema
            schema={collection.schema as FileSchema}
            downloadUrl={downloadUrl}
          />
        )}
        {collection.type === 'stream' && (
          <StreamCollectionSchema
            schema={collection.schema as StreamSchema}
            downloadUrl={downloadUrl}
          />
        )}
      </div>
      <div className='flex flex-col gap-2 p-2'>
        {matchedWorkflow && (
          <Button
            size='sm'
            colorScheme='light'
            variant='solid'
            className='w-full'
            icon={<TbRun />}
            href={`/${locale}/console/${currentWorkspace?.slug}/workflows/${matchedWorkflow.slug}`}
          >
            {dict.repository.viewWorkflow}
          </Button>
        )}

        {!immutable && (
          <Button
            size='sm'
            colorScheme='light'
            variant='solid'
            className='w-full'
            icon={<TbTrash />}
            disabled={processingDelete}
            onClick={handleDeleteCollection}
          >
            {dict.repository.deleteCollection}
          </Button>
        )}
      </div>
    </div>
  );
}
