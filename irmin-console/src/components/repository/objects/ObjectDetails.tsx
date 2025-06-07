'use client';

import { useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

import { IoClose } from 'react-icons/io5';
import {
  TbDownload,
  TbEdit,
  TbFile,
  TbFolderOpen,
  TbHistory,
  TbSchema,
  TbTrash,
  TbUpload,
} from 'react-icons/tb';

import Button from '@/components/ui/button';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import useBaseUrl from '@/hooks/useBaseUrl';
import { useRepositoryObject } from '@/hooks/useRepositoryObject';
import { useRepositoryObjectContent } from '@/hooks/useRepositoryObjectContent';
import { useResourceAllowed } from '@/hooks/useResourceAllowed';

import { Object } from '@/types/core/Object';
import { ObjectSchema } from '@/types/core/ObjectSchema';
import { PolicyAction, PolicyResource } from '@/types/core/Policy';

import MoveRenameObjectModal from './MoveRenameObjectModal';
import UploadObjectModal from './UploadObjectModal';

/**
 * UI for the object details.
 *
 * @param props - The component props
 * @param props.selectedObject - The selected object to display details for
 * @param props.setCurrentPath - (optional) The function to set the current path
 * @param props.selectedObjectSchema - (optional) The schema of the selected object
 * @param props.closeDetails - (optional) The function to close the details view. If not provided, the view will not show a close button
 * @param props.viewObject - (optional) The function to view the object.
 * @param props.hideViewButton - (optional) Set this to true in order to hide the "view object" button. Used in the object viewer.
 * @param props.hideSchemaButton - (optional) Set this to true in order to hide the "view schema" button. Used in the schema viewer.
 */
export default function ObjectDetails({
  setCurrentPath,
  selectedObject,
  selectedObjectSchema,
  closeDetails,
  viewObject,
  hideViewButton = false,
  hideSchemaButton = false,
}: {
  setCurrentPath?: (path: string) => void;
  selectedObject?: Object;
  selectedObjectSchema?: ObjectSchema;
  closeDetails?: () => void;
  viewObject?: () => void;
  hideViewButton?: boolean;
  hideSchemaButton?: boolean;
}) {
  const router = useRouter();
  const { immutable, currentRef, repository } = useRepositoryContext();
  const { deleteObjectMutation, moveObjectMutation, uploadObjectMutation } =
    useRepositoryObject(repository.slug, currentRef, selectedObject?.path);
  const { irminModal, irminConfirm } = usePopup();
  const { dict } = useLocale();

  const { downloadObjectAsZipMutation } = useRepositoryObjectContent(
    repository.slug,
    currentRef,
    selectedObject?.path
  );

  /** The base URL for the repository, eg. /en/workspace/workspace-slug/repositories/repository-slug */
  const baseUrl = useBaseUrl({
    pathname: '',
    segment: 'repositories',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const { isResourceAllowed } = useResourceAllowed();

  // Permission checks
  const canView = isResourceAllowed(
    PolicyResource.RepositoryObject,
    PolicyAction.Read,
    repository.id
  );
  const canViewSchema = isResourceAllowed(
    PolicyResource.RepositoryObject,
    PolicyAction.Read,
    repository.id
  );
  const canUpload =
    isResourceAllowed(
      PolicyResource.RepositoryObject,
      PolicyAction.Create,
      repository.id
    ) &&
    isResourceAllowed(
      PolicyResource.RepositoryObject,
      PolicyAction.Update,
      repository.id
    );
  const canChangeHistory = isResourceAllowed(
    PolicyResource.RepositoryObject,
    PolicyAction.Read,
    repository.id
  );
  const canDownload = isResourceAllowed(
    PolicyResource.RepositoryObject,
    PolicyAction.Read,
    repository.id
  );
  const canMoveOrRename = isResourceAllowed(
    PolicyResource.RepositoryObject,
    PolicyAction.Update,
    repository.id
  );
  const canDelete = isResourceAllowed(
    PolicyResource.RepositoryObject,
    PolicyAction.Delete,
    repository.id
  );

  const handleUploadAndReplace = useCallback(() => {
    if (!selectedObject || immutable) return;
    irminModal.show(
      dict.repository.objects.uploadObject,
      <UploadObjectModal
        currentRepository={repository.slug}
        currentRef={currentRef ?? 'main'}
        uploadObject={async (path: string, ref: string, files: FileList) => {
          uploadObjectMutation.mutate({
            path,
            ref,
            files,
          });
        }}
        prefilledName={selectedObject?.name}
      />
    );
  }, [
    dict,
    immutable,
    selectedObject,
    irminModal,
    currentRef,
    uploadObjectMutation,
    repository.slug,
  ]);

  const handleMoveOrRename = useCallback(() => {
    if (!selectedObject || immutable) return;
    irminModal.show(
      `${dict.repository.objects.moveOrRename}: ${selectedObject.name} @ ${currentRef}`,
      <MoveRenameObjectModal
        moveObject={async (oldPath: string, newPath: string) => {
          await moveObjectMutation.mutateAsync({
            oldPath,
            newPath,
            ref: currentRef ?? '',
          });
        }}
        selectedObject={selectedObject}
      />
    );
  }, [
    dict,
    immutable,
    selectedObject,
    currentRef,
    moveObjectMutation,
    irminModal,
  ]);

  const handleDelete = useCallback(async () => {
    if (!selectedObject || immutable) return;
    const confirmed = await irminConfirm(
      'warning',
      `${dict.fileNavigator.deleteConfirmation} object: ${selectedObject.path}?`
    );
    if (!confirmed) return;
    await deleteObjectMutation.mutateAsync({
      path: selectedObject.path,
      ref: currentRef ?? '',
    });
    if (closeDetails) {
      closeDetails();
    }
  }, [
    dict,
    immutable,
    selectedObject,
    closeDetails,
    irminConfirm,
    deleteObjectMutation,
    currentRef,
  ]);

  const handleView = useCallback(() => {
    if (!selectedObject) return;
    if (viewObject) viewObject();
    else {
      router.push(
        `${baseUrl}/object?path=${selectedObject.path}&ref=${currentRef}`
      );
    }
  }, [selectedObject, baseUrl, currentRef, viewObject, router]);

  const handleViewChangeHistory = useCallback(() => {
    if (!selectedObject) return;
    router.push(`${baseUrl}/object/history?path=${selectedObject.path}`);
  }, [selectedObject, baseUrl, router]);

  const [downloading, setDownloading] = useState(false);
  const handleDownload = useCallback(async () => {
    if (!selectedObject) return;
    setDownloading(true);
    try {
      await downloadObjectAsZipMutation.mutateAsync({
        path: selectedObject.path,
        ref: currentRef ?? '',
      });
    } catch (error) {
      console.error('Error downloading object:', error);
    } finally {
      setDownloading(false);
    }
  }, [selectedObject, downloadObjectAsZipMutation, currentRef]);

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
          {selectedObject.type === 'group' && setCurrentPath ? (
            <Button
              size='sm'
              variant='accent'
              className='w-full'
              icon={<TbFolderOpen />}
              onClick={() => setCurrentPath(selectedObject.path)}
              disabled={!canView}
            >
              {dict.fileNavigator.open}
            </Button>
          ) : (
            <>
              {!hideViewButton && canView && (
                <Button
                  size='sm'
                  variant='accent'
                  className='w-full'
                  icon={<TbFile />}
                  onClick={handleView}
                >
                  {dict.repository.objects.view}
                </Button>
              )}
              {!hideSchemaButton && canViewSchema && (
                <Button
                  size='sm'
                  variant='secondary'
                  className='w-full'
                  href={`${baseUrl}/schema?path=${selectedObject.path}&ref=${currentRef}`}
                  icon={<TbSchema />}
                >
                  {dict.repository.objects.viewSchema}
                </Button>
              )}
              {canUpload && (
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
              )}
            </>
          )}
          {canChangeHistory && (
            <Button
              size='sm'
              variant='secondary'
              className='w-full'
              icon={<TbHistory />}
              onClick={handleViewChangeHistory}
            >
              {dict.repository.objects.changeHistory}
            </Button>
          )}
          {canDownload && (
            <Button
              size='sm'
              variant='secondary'
              className='w-full'
              icon={<TbDownload />}
              onClick={handleDownload}
              loading={downloading}
            >
              {dict.common.download}
            </Button>
          )}
          {canMoveOrRename && (
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
          )}
          {canDelete && (
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
          )}
        </div>
      </div>
    </div>
  );
}
