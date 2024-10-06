'use client';

import { useCallback, useMemo, useState } from 'react';

import IrminCore from '@/services/core/IrminCore';

import { TbRun, TbTrash } from 'react-icons/tb';

import Button from '@/components/common/button/Button';
import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepository } from '@/context/RepositoryContext';
import { useWorkspace } from '@/context/workspace';

import useBaseUrl from '@/hooks/useBaseUrl';

import { FileSchema } from '@/types/core/FileCollection';
import { FolderSchema } from '@/types/core/FolderCollection';
import { TableSchema } from '@/types/core/TableCollection';

import FileCollectionSchema from './FileCollectionSchema';
import FolderCollectionSchema from './FolderCollectionSchema';
import TableCollectionSchema from './TableCollectionSchema';

/**
 * Component for displaying the schema of a collection.
 *
 * @param props - The component props
 * @param props.collectionID - The ID of the collection to display the schema for
 * @param props.immutable - Whether the repository or ref is immutable
 */
export default function CollectionSchema({
  collectionID,
  immutable,
}: {
  collectionID: string;
  immutable: boolean;
}) {
  const { dict, locale } = useLocale();
  const { irminAlert, irminConfirm } = usePopup();

  const repositoryUrl = useBaseUrl({
    pathname: '',
    segment: 'repositories',
    includeSegment: true,
    segmentsAfter: 1,
  });

  // The base URL for the workspace, eg. /en/console/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'console',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const {
    workflows: { allWorkflows },
  } = useWorkspace();

  const { repositoryService } = useMemo(() => new IrminCore(locale), [locale]);

  const { currentRepository, currentRef, schema } = useRepository();

  // Collection schema that is associated with the collection ID
  const collection = useMemo(
    () => schema?.find((schema) => schema.id === collectionID),
    [schema, collectionID]
  );

  // Type specific label for the collection
  const typeScpecificLabel = useMemo(() => {
    if (!collection) return '';
    if (collection.type === 'table') {
      return dict.repository.schema.table;
    }
    if (collection.type === 'folder') {
      return dict.repository.schema.folder;
    }
    if (collection.type === 'file') {
      return dict.repository.schema.file;
    }
    return collection.type;
  }, [collection, dict]);

  // Workflow that is associated with the collection
  const matchedWorkflow = useMemo(() => {
    return allWorkflows.find(
      (workflow) => workflow.id === collection?.workflow
    );
  }, [allWorkflows, collection]);

  // Structured download URL for the collection
  const downloadUrl = useMemo(() => {
    if (!collection) return '';
    const urlParams = new URLSearchParams();
    urlParams.append('collection', collection.name);
    urlParams.append('ref', currentRef ?? '');
    return `${repositoryUrl}/download?${urlParams.toString()}`;
  }, [repositoryUrl, currentRef, collection]);

  // Processing state for the delete action
  const [processingDelete, setProcessingDelete] = useState(false);
  // Handle delete collection from the repository
  const handleDeleteCollection = useCallback(() => {
    if (!collection) return;
    // Confirm the delete action
    irminConfirm(
      'warning',
      dict.repository.collections.deleteConfirm,
      async (confirmed) => {
        // Make sure the user confirmed the delete action
        if (!confirmed) return;
        // Make sure we are not already processing a delete action
        setProcessingDelete(true);
        try {
          // Upload the collection
          const res = await repositoryService.deleteCollection(
            currentRepository.slug,
            currentRef ?? '',
            collection.name
          );
          // Show success message
          irminAlert(
            'success',
            res.message ?? 'Collection deleted successfully'
          );
        } catch (error) {
          console.error('Failed to delete the collection:', error);
          irminAlert(
            'error',
            (error as Error)?.message ?? 'Failed to delete the collection'
          );
        } finally {
          setProcessingDelete(false);
        }
      }
    );
  }, [
    currentRef,
    currentRepository,
    dict,
    irminAlert,
    irminConfirm,
    repositoryService,
    collection,
  ]);

  if (!collection)
    return (
      <div className='rounded-md border border-gray-100 bg-white dark:border-gray-800 dark:bg-irmin_black'>
        <LoadingSkeleton className='h-96 w-72' />
      </div>
    );

  return (
    <div className='mb-4 flex w-max min-w-72 flex-col overflow-scroll rounded-md bg-white text-xs dark:bg-irmin_black'>
      <div
        className={`border-b border-gray-200 bg-gray-50 p-2 py-4 dark:border-gray-800 dark:bg-irmin_black-800`}
      >
        <p className='text-xs opacity-60'>
          {typeScpecificLabel} {`"${collection.name}"`}{' '}
          <span className='lowercase'>{dict.repository.schema.schema}</span>
        </p>
      </div>
      <div className='p-2 pt-3'>
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
      </div>
      <div className='flex flex-col gap-2 p-2'>
        {matchedWorkflow && (
          <Button
            size='sm'
            colorScheme='light'
            variant='solid'
            className='w-full'
            icon={<TbRun />}
            href={`${workspaceUrl}/workflows/${matchedWorkflow.id}`}
          >
            {dict.repository.viewWorkflow}
          </Button>
        )}
        {!immutable && !collection.is_immutable && (
          <Button
            size='sm'
            colorScheme='light'
            variant='solid'
            className='w-full'
            icon={<TbTrash />}
            disabled={processingDelete}
            onClick={handleDeleteCollection}
          >
            {dict.repository.collections.deleteCollection}
          </Button>
        )}
      </div>
    </div>
  );
}
