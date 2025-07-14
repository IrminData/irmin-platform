'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

import { Button } from '@/components/ui/button';
import { WorkspaceTagSelector } from '@/components/workspace/WorkspaceTagSelector';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepositoryContext } from '@/context/RepositoryContext';

import useBaseUrl from '@/hooks/useBaseUrl';
import { useRepositoryObject } from '@/hooks/useRepositoryObject';
import { useRepositoryObjectContent } from '@/hooks/useRepositoryObjectContent';
import { useResourceAllowed } from '@/hooks/useResourceAllowed';
import { useWorkspaceTags } from '@/hooks/useWorkspaceTags';

import type { Object } from '@/types/core/Object';
import type { ObjectSchema } from '@/types/core/ObjectSchema';
import { PolicyAction, PolicyResource } from '@/types/core/Policy';
import type { Tag } from '@/types/core/Tag';
import { TagEntityType } from '@/types/core/Tag';

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
  const canView = useMemo(
    () =>
      isResourceAllowed(
        PolicyResource.RepositoryObject,
        PolicyAction.Read,
        repository.id
      ),
    [isResourceAllowed, repository.id]
  );
  const canViewSchema = useMemo(
    () =>
      isResourceAllowed(
        PolicyResource.RepositoryObject,
        PolicyAction.Read,
        repository.id
      ),
    [isResourceAllowed, repository.id]
  );
  const canUpload = useMemo(
    () =>
      isResourceAllowed(
        PolicyResource.RepositoryObject,
        PolicyAction.Create,
        repository.id
      ) &&
      isResourceAllowed(
        PolicyResource.RepositoryObject,
        PolicyAction.Update,
        repository.id
      ),
    [isResourceAllowed, repository.id]
  );
  const canChangeHistory = useMemo(
    () =>
      isResourceAllowed(
        PolicyResource.RepositoryObject,
        PolicyAction.Read,
        repository.id
      ),
    [isResourceAllowed, repository.id]
  );
  const canDownload = useMemo(
    () =>
      isResourceAllowed(
        PolicyResource.RepositoryObject,
        PolicyAction.Read,
        repository.id
      ),
    [isResourceAllowed, repository.id]
  );
  const canMoveOrRename = useMemo(
    () =>
      isResourceAllowed(
        PolicyResource.RepositoryObject,
        PolicyAction.Update,
        repository.id
      ),
    [isResourceAllowed, repository.id]
  );
  const canDelete = useMemo(
    () =>
      isResourceAllowed(
        PolicyResource.RepositoryObject,
        PolicyAction.Delete,
        repository.id
      ),
    [isResourceAllowed, repository.id]
  );
  const canViewTags = useMemo(
    () =>
      isResourceAllowed(PolicyResource.WorkspaceTag, PolicyAction.Read) &&
      isResourceAllowed(
        PolicyResource.RepositoryObject,
        PolicyAction.Read,
        repository.id
      ),
    [isResourceAllowed, repository.id]
  );
  const canChangeTags = useMemo(
    () =>
      isResourceAllowed(PolicyResource.WorkspaceTag, PolicyAction.Create) &&
      isResourceAllowed(
        PolicyResource.RepositoryObject,
        PolicyAction.Update,
        repository.id
      ),
    [isResourceAllowed, repository.id]
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

  const { addTagToEntityMutation, removeTagFromEntityMutation } =
    useWorkspaceTags();
  const [selectedTags, setSelectedTags] = useState<Tag[]>(
    selectedObject?.tags ?? []
  );
  const [updatingTags, setUpdatingTags] = useState(false);
  const previousTags = useRef<string>('');

  // Synchronize selectedTags with selectedObject.tags when selectedObject changes
  useEffect(() => {
    setSelectedTags(selectedObject?.tags ?? []);
    previousTags.current = ''; // Reset to ensure proper comparison in handleUpdateTags
  }, [selectedObject]);

  const handleUpdateTags = useCallback(
    async (tags: Tag[]) => {
      try {
        if (!selectedObject) return [];
        if (previousTags.current === JSON.stringify(tags)) {
          return tags;
        }

        // Use selectedObject.tags directly instead of selectedTags to avoid race condition
        const currentTags = selectedObject.tags ?? [];
        setSelectedTags(tags);
        setUpdatingTags(true);

        const tagsToAdd = [];
        const tagsToRemove = [];
        for (const tag of tags) {
          if (!currentTags.some((t) => t.id === tag.id)) {
            tagsToAdd.push(tag);
          }
        }
        for (const tag of currentTags) {
          if (!tags.some((t) => t.id === tag.id)) {
            tagsToRemove.push(tag);
          }
        }
        await Promise.all([
          ...tagsToAdd.map((tag) =>
            addTagToEntityMutation.mutateAsync({
              id: tag.id,
              entityType: TagEntityType.RepositoryObject,
              entityId: selectedObject.id,
            })
          ),
          ...tagsToRemove.map((tag) =>
            removeTagFromEntityMutation.mutateAsync({
              id: tag.id,
              entityType: TagEntityType.RepositoryObject,
              entityId: selectedObject.id,
            })
          ),
        ]);

        // Only update previousTags after successful API calls
        previousTags.current = JSON.stringify(tags);
        return tags;
      } catch (error) {
        console.error('Error updating tags:', error);
        return [];
      } finally {
        setUpdatingTags(false);
      }
    },
    [addTagToEntityMutation, removeTagFromEntityMutation, selectedObject]
  );

  if (!selectedObject) return <></>;

  return (
    <div
      className={`
        mb-4 flex w-max min-w-80 flex-col overflow-scroll rounded-lg border
        border-card bg-background text-xs
      `}
    >
      <div
        className={`
          flex items-center justify-between border-b border-gray-200 p-2 py-4
          dark:border-gray-800
        `}
      >
        <p className='text-sm'>{selectedObject.name}</p>
        {closeDetails && (
          <Button
            variant='ghost'
            size='sm'
            onClick={closeDetails}
            icon={<IoClose className='size-6' />}
            className='h-5 p-0'
          />
        )}
      </div>
      <div className='flex flex-col gap-2 p-2'>
        {canViewTags && (
          <div
            className={`
              border-b border-gray-200 pb-4
              dark:border-gray-800
            `}
          >
            <WorkspaceTagSelector
              selectedTags={selectedTags}
              onTagsChange={handleUpdateTags}
              loading={updatingTags}
              disabled={!canChangeTags}
            />
          </div>
        )}
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
        <hr
          className={`
            border-gray-200
            dark:border-gray-800
          `}
        />
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
