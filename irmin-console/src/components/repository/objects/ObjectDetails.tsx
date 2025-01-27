'use client';

import { useCallback } from 'react';

import { IoClose } from 'react-icons/io5';
import {
  TbDownload,
  TbEdit,
  TbFile,
  TbFolderOpen,
  TbSchema,
  TbTrash,
  TbUpload,
} from 'react-icons/tb';

import Button from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepository } from '@/context/RepositoryContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import { Object } from '@/types/core/Object';
import { ObjectSchema } from '@/types/core/ObjectSchema';

import MoveRenameObjectModal from './MoveRenameObjectModal';
import UploadObjectModal from './UploadObjectModal';

/**
 * UI for the object details.
 *
 * @param props - The component props
 * @param props.selectedObject - The selected object to display details for
 * @param props.selectedObjectSchema - (optional) The schema of the selected object
 * @param props.closeDetails - (optional) The function to close the details view. If not provided, the view will not show a close button
 * @param props.hideViewButton - (optional) Set this to true in order to hide the "view object" button. Used in the object viewer.
 * @param props.hideSchemaButton - (optional) Set this to true in order to hide the "view schema" button. Used in the schema viewer.
 */
export default function ObjectDetails({
  selectedObject,
  selectedObjectSchema,
  closeDetails,
  hideViewButton = false,
  hideSchemaButton = false,
}: {
  selectedObject?: Object;
  selectedObjectSchema?: ObjectSchema;
  closeDetails?: () => void;
  hideViewButton?: boolean;
  hideSchemaButton?: boolean;
}) {
  const {
    immutable,
    currentPath,
    currentRepository,
    currentRef,
    deleteObject,
    moveObject,
    uploadObject,
  } = useRepository();
  const { irminModal, irminConfirm } = usePopup();
  const { dict } = useLocale();
  const { updateCurrentPath } = useRepository();

  const handleUploadAndReplace = useCallback(() => {
    if (!selectedObject || immutable) return;
    irminModal.show(
      dict.repository.objects.uploadObject,
      <UploadObjectModal
        currentPath={currentPath}
        currentRepository={currentRepository.slug}
        currentRef={currentRef ?? 'main'}
        uploadObject={uploadObject}
        prefilledName={selectedObject?.name}
      />
    );
  }, [
    dict,
    immutable,
    selectedObject,
    irminModal,
    currentPath,
    currentRepository,
    currentRef,
    uploadObject,
  ]);

  const handleMoveOrRename = useCallback(() => {
    if (!selectedObject || immutable) return;
    irminModal.show(
      `${dict.repository.objects.moveOrRename}: ${selectedObject.name} @ ${currentRef}`,
      <MoveRenameObjectModal
        moveObject={moveObject}
        selectedObject={selectedObject}
        currentPath={currentPath}
      />
    );
  }, [
    dict,
    immutable,
    selectedObject,
    currentPath,
    currentRef,
    moveObject,
    irminModal,
  ]);

  const handleDelete = useCallback(async () => {
    if (!selectedObject || immutable) return;
    const confirmed = await irminConfirm(
      'warning',
      `${dict.fileNavigator.deleteConfirmation} object: ${selectedObject.path}?`
    );
    if (!confirmed) return;
    await deleteObject(selectedObject.name);
    if (closeDetails) {
      closeDetails();
    }
  }, [
    dict,
    immutable,
    selectedObject,
    closeDetails,
    irminConfirm,
    deleteObject,
  ]);

  /** The base URL for the repository, eg. /en/workspace/workspace-slug/repositories/repository-slug */
  const baseUrl = useBaseUrl({
    pathname: '',
    segment: 'repositories',
    includeSegment: true,
    segmentsAfter: 1,
  });

  if (!selectedObject) return <></>;

  return (
    <div className='border-card bg-background mb-4 flex w-max min-w-80 flex-col overflow-scroll rounded-lg border text-xs'>
      <div
        className={`flex items-center justify-between border-b border-gray-200 p-2 py-4 dark:border-gray-800`}
      >
        <p className='text-sm'>{selectedObject.name}</p>
        {closeDetails && (
          <Button
            variant='ghost'
            size='sm'
            onClick={closeDetails}
            icon={<IoClose className='h-6 w-6' />}
            className='h-5 px-0 py-0'
          />
        )}
      </div>
      <div className='flex flex-col gap-2 p-2'>
        {/** Description of the object */}
        {selectedObjectSchema && (
          <div className='flex w-full justify-between gap-1'>
            <span className='font-semibold'>{dict.common.description}:</span>
            <span className='text-right'>
              {selectedObjectSchema.description}
            </span>
          </div>
        )}
        {/** Metadata of the object */}
        <div className='flex w-full justify-between gap-1'>
          <span className='font-semibold'>{dict.repository.objects.path}:</span>
          <span className='text-right'>{selectedObject.path}</span>
        </div>
        <div className='flex w-full justify-between gap-1'>
          <span className='font-semibold'>{dict.repository.objects.type}:</span>
          <span className='text-right'>{selectedObject.type}</span>
        </div>
        {selectedObject.content_type && (
          <div className='flex w-full justify-between gap-1'>
            <span className='font-semibold'>
              {dict.repository.objects.contentType}:
            </span>
            <span className='text-right'>{selectedObject.content_type}</span>
          </div>
        )}
        {selectedObject.last_modified && (
          <div className='flex w-full justify-between gap-1'>
            <span className='font-semibold'>{dict.common.lastModified}:</span>
            <span className='text-right'>
              {new Date(selectedObject.last_modified).toLocaleString()}
            </span>
          </div>
        )}
        {/** Properties from the schema */}
        {selectedObjectSchema &&
          (selectedObjectSchema.type === 'structured' ||
            selectedObjectSchema.type === 'binary') && (
            <>
              <div className='flex w-full justify-between gap-1'>
                <span className='font-semibold'>{dict.common.size}:</span>
                <span className='text-right'>
                  {(selectedObjectSchema.size / 1024).toFixed(3)}KB
                </span>
              </div>
            </>
          )}
        <hr className='border-gray-200 dark:border-gray-800' />
        <div className='flex w-full flex-col gap-1'>
          {/** Buttons for all possible actions for the object */}
          {selectedObject.type === 'group' ? (
            <Button
              size='sm'
              variant='accent'
              className='w-full'
              icon={<TbFolderOpen />}
              onClick={() => updateCurrentPath(selectedObject.path)}
            >
              {dict.fileNavigator.open}
            </Button>
          ) : (
            <>
              {!hideViewButton && (
                <Button
                  size='sm'
                  variant='accent'
                  className='w-full'
                  icon={<TbFile />}
                  href={`${baseUrl}/object?path=${selectedObject.path}&ref=${currentRef}`}
                >
                  {dict.repository.objects.view}
                </Button>
              )}
              {!hideSchemaButton && (
                <Button
                  size='sm'
                  variant='default'
                  className='w-full'
                  href={`${baseUrl}/schema?path=${selectedObject.path}&ref=${currentRef}`}
                  icon={<TbSchema />}
                >
                  {dict.repository.objects.viewSchema}
                </Button>
              )}
              <Button
                size='sm'
                variant='secondary'
                className='w-full'
                icon={<TbUpload />}
                onClick={handleUploadAndReplace}
                disabled={immutable}
              >
                {dict.repository.objects.uploadAndReplace}
              </Button>
            </>
          )}
          <Button
            size='sm'
            variant='secondary'
            className='w-full'
            href={`${baseUrl}/object/download?path=${selectedObject.path}&ref=${currentRef}`}
            icon={<TbDownload />}
          >
            {dict.common.actions.download}
          </Button>
          <Button
            size='sm'
            variant='secondary'
            className='w-full'
            icon={<TbEdit />}
            onClick={handleMoveOrRename}
            disabled={immutable}
          >
            {dict.repository.objects.moveOrRename}
          </Button>
          <Button
            size='sm'
            variant='secondary'
            className='w-full'
            icon={<TbTrash />}
            disabled={immutable}
            onClick={handleDelete}
          >
            {dict.list.delete}
          </Button>
        </div>
      </div>
    </div>
  );
}
