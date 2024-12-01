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

import { Object } from '@/types/core/Object';

import MoveRenameObjectModal from './MoveRenameObjectModal';
import UploadObjectModal from './UploadObjectModal';

/**
 * UI for the object details.
 *
 * @param props - The component props
 * @param props.selectedObject - The selected object to display details for
 * @param props.closeDetails - The function to close the details view
 */
export default function ObjectDetails({
  selectedObject,
  closeDetails,
}: {
  selectedObject?: Object;
  closeDetails: () => void;
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
    closeDetails();
  }, [
    dict,
    immutable,
    selectedObject,
    closeDetails,
    irminConfirm,
    deleteObject,
  ]);

  if (!selectedObject) return <></>;

  return (
    <div className='mb-4 flex w-max min-w-80 flex-col overflow-scroll rounded-lg border border-card bg-background text-xs'>
      <div
        className={`flex items-center justify-between border-b border-gray-200 p-2 py-4 dark:border-gray-800`}
      >
        <p className='text-sm'>{selectedObject.name}</p>
        <Button
          variant='ghost'
          size='sm'
          onClick={closeDetails}
          icon={<IoClose className='h-6 w-6' />}
          className='h-5 px-0 py-0'
        />
      </div>
      <div className='flex flex-col gap-2 p-2'>
        {/** Metadata of the object */}
        <div className='flex w-full justify-between gap-1'>
          <span className='font-semibold'>{dict.repository.objects.path}:</span>
          <span>{selectedObject.path}</span>
        </div>
        <div className='flex w-full justify-between gap-1'>
          <span className='font-semibold'>{dict.repository.objects.type}:</span>
          <span>{selectedObject.type}</span>
        </div>
        {selectedObject.content_type && (
          <div className='flex w-full justify-between gap-1'>
            <span className='font-semibold'>
              {dict.repository.objects.contentType}:
            </span>
            <span>{selectedObject.content_type}</span>
          </div>
        )}
        {selectedObject.last_modified && (
          <div className='flex w-full justify-between gap-1'>
            <span className='font-semibold'>
              {dict.repository.objects.lastModified}:
            </span>
            <span>
              {new Date(selectedObject.last_modified).toLocaleString()}
            </span>
          </div>
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
              <Button
                size='sm'
                variant='accent'
                className='w-full'
                icon={<TbFile />}
              >
                {dict.repository.objects.view}
              </Button>
              <Button
                size='sm'
                variant='default'
                className='w-full'
                icon={<TbSchema />}
              >
                {dict.repository.objects.viewSchema}
              </Button>
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
            icon={<TbDownload />}
          >
            {dict.repository.objects.download}
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
            {dict.fileNavigator.delete}
          </Button>
        </div>
      </div>
    </div>
  );
}
