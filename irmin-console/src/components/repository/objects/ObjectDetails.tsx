'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { IoClose } from 'react-icons/io5';
import {
  TbCheck,
  TbCheckbox,
  TbCopy,
  TbDownload,
  TbEdit,
  TbFile,
  TbFolderOpen,
  TbHistory,
  TbLink,
  TbSchema,
  TbTrash,
  TbUpload,
  TbVectorTriangle,
} from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { WorkspaceTagSelector } from '@/components/workspace/WorkspaceTagSelector';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useRepositoryContext } from '@/context/RepositoryContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import {
  useRepositoryObject,
  useRepositoryObjectContent,
  useWorkspaceTags,
} from '@/hooks/api';
import { useBaseUrl, useResourceAllowed } from '@/hooks/utils';

import type { ObjectSchema } from '@/types/core/ObjectSchema';
import type { RepositoryObject } from '@/types/core/RepositoryObject';
import type { Tag } from '@/types/core/Tag';

import EmbeddingWizard from './EmbeddingWizard';
import MoveRenameObjectModal from './MoveRenameObjectModal';
import UploadObjectModal from './UploadObjectModal';
import ValidateObjectModal from './ValidateObjectModal';

/**
 * List of file extensions supported for vectorization.
 * Must be kept in sync with backend: irmin/embeddings/embeddings_utils.go GetSupportedFormats()
 */
const VECTORIZABLE_FORMATS = [
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.jsonl',
  '.ndjson',
  '.tsv',
  '.tab',
  '.parquet',
  '.xlsx',
  '.xlsm',
  '.xml',
  '.yaml',
  '.yml',
  '.pdf',
  '.docx',
];

/**
 * Check if a file can be vectorized based on its extension.
 */
const isVectorizableFormat = (fileName: string): boolean => {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  return VECTORIZABLE_FORMATS.includes(ext);
};

/**
 * Checks if a repository object is an embedding file.
 * Embedding files are .parquet files with the 'irmin-file-type' metadata set to 'embeddings'.
 */
const isEmbeddingFile = (obj: RepositoryObject): boolean =>
  obj.path.endsWith('.parquet') &&
  obj.metadata?.['irmin-file-type'] === 'embeddings';

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
  setCurrentPath?: (_path: string) => void;
  selectedObject?: RepositoryObject;
  selectedObjectSchema?: ObjectSchema;
  closeDetails?: () => void;
  viewObject?: () => void;
  hideViewButton?: boolean;
  hideSchemaButton?: boolean;
}) {
  const router = useRouter();
  const { workspaceSlug } = useWorkspaceContext();
  const { immutable, currentRef, repository } = useRepositoryContext();
  const {
    deleteObjectMutation,
    moveObjectMutation,
    uploadObjectMutation,
    validateObjectMutation,
    createSignedURLMutation,
  } = useRepositoryObject(repository.slug, currentRef, selectedObject?.path);
  const { irminModal, irminConfirm, irminAlert } = usePopup();
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
    () => isResourceAllowed('repository_object', 'read', repository.id),
    [isResourceAllowed, repository.id]
  );
  const canViewSchema = useMemo(
    () => isResourceAllowed('repository_object', 'read', repository.id),
    [isResourceAllowed, repository.id]
  );
  const canUpload = useMemo(
    () =>
      isResourceAllowed('repository_object', 'create', repository.id) &&
      isResourceAllowed('repository_object', 'update', repository.id),
    [isResourceAllowed, repository.id]
  );
  const canChangeHistory = useMemo(
    () => isResourceAllowed('repository_object', 'read', repository.id),
    [isResourceAllowed, repository.id]
  );
  const canDownload = useMemo(
    () => isResourceAllowed('repository_object', 'read', repository.id),
    [isResourceAllowed, repository.id]
  );
  const canMoveOrRename = useMemo(
    () => isResourceAllowed('repository_object', 'update', repository.id),
    [isResourceAllowed, repository.id]
  );
  const canDelete = useMemo(
    () => isResourceAllowed('repository_object', 'delete', repository.id),
    [isResourceAllowed, repository.id]
  );
  const canValidate = useMemo(
    () => isResourceAllowed('repository_object', 'read', repository.id),
    [isResourceAllowed, repository.id]
  );
  const canViewTags = useMemo(
    () =>
      isResourceAllowed('workspace_tag', 'read') &&
      isResourceAllowed('repository_object', 'read', repository.id),
    [isResourceAllowed, repository.id]
  );
  const canChangeTags = useMemo(
    () =>
      isResourceAllowed('workspace_tag', 'create') &&
      isResourceAllowed('repository_object', 'update', repository.id),
    [isResourceAllowed, repository.id]
  );
  const canVectorize = useMemo(
    () =>
      selectedObject &&
      isResourceAllowed('repository_object', 'read', repository.id) &&
      isResourceAllowed('repository_object', 'create', repository.id) &&
      isVectorizableFormat(selectedObject.name) &&
      !isEmbeddingFile(selectedObject),
    [isResourceAllowed, repository.id, selectedObject]
  );

  const handleUploadAndReplace = useCallback(() => {
    if (!selectedObject || immutable) return;
    irminModal.show(
      dict.repository.objects.uploadObject,
      <UploadObjectModal
        currentRepository={repository.slug}
        currentRef={currentRef ?? repository.default_branch}
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
    repository.default_branch,
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

  const handleValidate = useCallback(() => {
    if (!selectedObject) return;
    irminModal.show(
      `${dict.repository.objects.validate}: ${selectedObject.name}`,
      <ValidateObjectModal
        objectPath={selectedObject.path}
        repositorySlug={repository.slug}
        currentRef={currentRef ?? undefined}
        workspaceSlug={workspaceSlug}
        validateObject={async (validationSchema, validationMode) => {
          return await validateObjectMutation.mutateAsync({
            path: selectedObject.path,
            ref: currentRef ?? '',
            validationSchema,
            validationMode,
          });
        }}
      />
    );
  }, [
    selectedObject,
    irminModal,
    dict.repository.objects.validate,
    repository.slug,
    currentRef,
    workspaceSlug,
    validateObjectMutation,
  ]);

  const handleVectorize = useCallback(() => {
    if (!selectedObject || immutable) return;
    irminModal.show(
      dict.repository.objects.embeddingsWizardTitle,
      <EmbeddingWizard
        repositorySlug={repository.slug}
        currentRef={currentRef ?? repository.default_branch}
        initialSourcePath={selectedObject.path}
      />
    );
  }, [
    selectedObject,
    immutable,
    irminModal,
    dict,
    repository.slug,
    repository.default_branch,
    currentRef,
  ]);

  const handleView = useCallback(() => {
    if (!selectedObject) return;
    if (viewObject) viewObject();
    else {
      router.push(
        `${baseUrl}/object?path=${encodeURIComponent(selectedObject.path)}&ref=${encodeURIComponent(currentRef ?? repository.default_branch)}`
      );
    }
  }, [
    selectedObject,
    baseUrl,
    currentRef,
    viewObject,
    router,
    repository.default_branch,
  ]);

  const handleViewChangeHistory = useCallback(() => {
    if (!selectedObject) return;
    router.push(`${baseUrl}/object/history?path=${selectedObject.path}`);
  }, [selectedObject, baseUrl, router]);

  const [downloading, setDownloading] = useState(false);
  const [selectorCopied, setSelectorCopied] = useState(false);
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

  const [sharePopoverOpen, setSharePopoverOpen] = useState(false);
  const [shareLinkExpiry, setShareLinkExpiry] = useState('24');
  const [customHours, setCustomHours] = useState('48');
  const [generatingShareLink, setGeneratingShareLink] = useState(false);

  const handleShare = useCallback(async () => {
    if (!selectedObject) return;
    setGeneratingShareLink(true);
    try {
      const expiresInHours =
        shareLinkExpiry === 'never'
          ? 0
          : shareLinkExpiry === 'custom'
            ? parseInt(customHours, 10) || 24
            : parseInt(shareLinkExpiry, 10);
      const result = await createSignedURLMutation.mutateAsync({
        path: selectedObject.path,
        ref: currentRef ?? '',
        expiresInHours,
      });
      try {
        await navigator.clipboard.writeText(result.url);
        const expiryLabel =
          shareLinkExpiry === 'custom'
            ? `${customHours} ${dict.repository.objects.shareLinkCustomHours.toLowerCase()}`
            : dict.repository.objects.shareLinkExpiryOptions[
                shareLinkExpiry as keyof typeof dict.repository.objects.shareLinkExpiryOptions
              ];
        irminAlert(
          'success',
          `${dict.repository.objects.shareLinkCopied} (${expiryLabel})`
        );
      } catch {
        irminAlert('error', dict.repository.objects.shareError);
      }
      setSharePopoverOpen(false);
    } catch (error) {
      console.error('Error creating share link:', error);
    } finally {
      setGeneratingShareLink(false);
    }
  }, [
    selectedObject,
    createSignedURLMutation,
    currentRef,
    shareLinkExpiry,
    customHours,
    irminAlert,
    dict,
  ]);

  const { addTagToEntityMutation, removeTagFromEntityMutation } =
    useWorkspaceTags(workspaceSlug);
  const [selectedTags, setSelectedTags] = useState<Tag[]>(
    selectedObject?.tags ?? []
  );
  const [updatingTags, setUpdatingTags] = useState(false);
  const previousTags = useRef<string>('');
  const currentTagsRef = useRef<Tag[]>(selectedObject?.tags ?? []);

  // Synchronize selectedTags with selectedObject.tags when selectedObject changes
  useEffect(() => {
    const tags = selectedObject?.tags ?? [];
    setSelectedTags(tags);
    currentTagsRef.current = tags;
    previousTags.current = ''; // Reset to ensure proper comparison in handleUpdateTags
  }, [selectedObject]);

  const handleUpdateTags = useCallback(
    async (tags: Tag[]) => {
      if (!selectedObject) return [];
      try {
        // Prevent duplicate calls with the same tags
        const tagsKey = JSON.stringify(tags);
        if (previousTags.current === tagsKey) {
          return tags;
        }

        // Use ref to get the most current tags state, handling rapid changes correctly
        // This ensures each operation builds on the previous optimistic update
        const currentTags = currentTagsRef.current;
        setSelectedTags(tags);
        currentTagsRef.current = tags;
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

        // Execute all add/remove operations
        await Promise.all([
          ...tagsToAdd.map((tag) =>
            addTagToEntityMutation.mutateAsync({
              id: tag.id,
              entityType: 'repository_objects',
              entityId: selectedObject.id,
            })
          ),
          ...tagsToRemove.map((tag) =>
            removeTagFromEntityMutation.mutateAsync({
              id: tag.id,
              entityType: 'repository_objects',
              entityId: selectedObject.id,
            })
          ),
        ]);

        // Only update previousTags after successful API calls
        previousTags.current = tagsKey;
        return tags;
      } catch (error) {
        console.error('Error updating tags:', error);
        // Revert to the last known good state on error
        const fallbackTags = selectedObject.tags ?? [];
        setSelectedTags(fallbackTags);
        currentTagsRef.current = fallbackTags;
        previousTags.current = JSON.stringify(fallbackTags);
        return fallbackTags;
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
        mb-4 flex w-full min-w-0 flex-col overflow-hidden rounded-lg border
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
              workspaceSlug={workspaceSlug}
            />
          </div>
        )}
        {(selectedObject.sql_selector ||
          selectedObjectSchema?.sql_selector) && (
          <div className='mt-2 flex w-full flex-col gap-2'>
            <div className='flex flex-col gap-1'>
              <span className='text-[10px] text-muted-foreground'>
                Placeholder (recommended):
              </span>
              <div
                className={`
                  flex items-center gap-1 rounded-sm bg-gray-100 p-1
                  dark:bg-gray-800
                `}
              >
                <code
                  className={`
                    flex-1 overflow-x-auto px-1 font-mono text-[10px]
                    whitespace-nowrap
                  `}
                >
                  {selectedObject.sql_selector ||
                    selectedObjectSchema?.sql_selector}
                </code>
                <Button
                  variant='ghost'
                  size='sm'
                  className='size-6 p-0'
                  onClick={async () => {
                    const selectorText =
                      selectedObject.sql_selector ||
                      selectedObjectSchema?.sql_selector ||
                      '';
                    await navigator.clipboard.writeText(selectorText);
                    setSelectorCopied(true);
                    setTimeout(() => {
                      setSelectorCopied(false);
                    }, 2000);
                  }}
                  title={selectorCopied ? dict.common.copied : dict.common.copy}
                  icon={
                    selectorCopied ? (
                      <TbCheck size={12} className='text-green-500' />
                    ) : (
                      <TbCopy size={12} />
                    )
                  }
                />
              </div>
            </div>
            {(selectedObject.s3_path_selector ||
              selectedObjectSchema?.s3_path_selector ||
              (workspaceSlug && selectedObject.repository_slug)) && (
              <div className='flex flex-col gap-1'>
                <span className='text-[10px] text-muted-foreground'>
                  Alternative S3 path:
                </span>
                <div
                  className={`
                    flex items-center gap-1 rounded-sm bg-gray-100 p-1
                    dark:bg-gray-800
                  `}
                >
                  <code
                    className={`
                      flex-1 overflow-x-auto px-1 font-mono text-[10px]
                      whitespace-nowrap
                    `}
                  >
                    {selectedObject.s3_path_selector ||
                      selectedObjectSchema?.s3_path_selector ||
                      (workspaceSlug && selectedObject.repository_slug
                        ? `s3://${workspaceSlug}-${selectedObject.repository_slug}/${selectedObject.ref || repository.default_branch}/${selectedObject.path}`
                        : '')}
                  </code>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='size-6 p-0'
                    onClick={async () => {
                      const s3Path =
                        selectedObject.s3_path_selector ||
                        selectedObjectSchema?.s3_path_selector ||
                        (workspaceSlug && selectedObject.repository_slug
                          ? `s3://${workspaceSlug}-${selectedObject.repository_slug}/${selectedObject.ref || repository.default_branch}/${selectedObject.path}`
                          : '');
                      await navigator.clipboard.writeText(s3Path);
                    }}
                    title={dict.common.copy}
                    icon={<TbCopy size={12} />}
                  />
                </div>
              </div>
            )}
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
        {/** Pointer target information */}
        {selectedObject.is_pointer && selectedObject.pointer_target && (
          <div
            className={`
              mt-2 flex w-full flex-col gap-2 rounded-md border border-accent/30
              bg-accent/5 p-2
            `}
          >
            <div className='flex items-center gap-1.5 text-accent'>
              <TbLink size={14} />
              <span className='font-semibold'>
                {dict.repository.objects.pointsTo}
              </span>
            </div>
            <div className='flex flex-col gap-1 text-xs'>
              <div className='flex justify-between gap-1'>
                <span className='text-muted-foreground'>
                  {dict.repository.objects.targetRepository}:
                </span>
                <span className='text-right font-medium'>
                  {selectedObject.pointer_target.target_repository}
                </span>
              </div>
              <div className='flex justify-between gap-1'>
                <span className='text-muted-foreground'>
                  {dict.repository.objects.path}:
                </span>
                <span className='text-right font-medium'>
                  {selectedObject.pointer_target.target_path}
                </span>
              </div>
              <div className='flex justify-between gap-1'>
                <span className='text-muted-foreground'>
                  {dict.repository.objects.targetBranchRef}:
                </span>
                <span className='text-right font-medium'>
                  {selectedObject.pointer_target.target_ref}
                </span>
              </div>
              {selectedObject.pointer_target.target_workspace && (
                <div className='flex justify-between gap-1'>
                  <span className='text-muted-foreground'>
                    {dict.workspaceSwitcher.workspace}:
                  </span>
                  <span className='text-right font-medium'>
                    {selectedObject.pointer_target.target_workspace}
                  </span>
                </div>
              )}
              {/** Show link to target if in the same workspace */}
              {(!selectedObject.pointer_target.target_workspace ||
                selectedObject.pointer_target.target_workspace ===
                  workspaceSlug) && (
                <Link
                  href={`${baseUrl.replace(repository.slug, selectedObject.pointer_target.target_repository)}/object?path=${encodeURIComponent(selectedObject.pointer_target.target_path)}&ref=${encodeURIComponent(selectedObject.pointer_target.target_ref)}`}
                  className={`
                    mt-1 flex items-center justify-center gap-1 rounded-md
                    bg-accent/10 px-2 py-1.5 text-center text-xs font-medium
                    text-accent transition-colors
                    hover:bg-accent/20
                  `}
                >
                  <TbFile size={14} />
                  {dict.repository.objects.view}{' '}
                  {dict.repository.objects.targetObject}
                </Link>
              )}
            </div>
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
                  {selectedObjectSchema.size
                    ? (selectedObjectSchema.size / 1024).toFixed(3)
                    : 'N/A'}
                  KB
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
              {canValidate && (
                <Button
                  size='sm'
                  variant='secondary'
                  className='w-full'
                  icon={<TbCheckbox />}
                  onClick={handleValidate}
                >
                  {dict.repository.objects.validateObject}
                </Button>
              )}
              {canVectorize && (
                <Button
                  size='sm'
                  variant='secondary'
                  className='w-full'
                  icon={<TbVectorTriangle />}
                  onClick={handleVectorize}
                  disabled={immutable}
                >
                  {dict.repository.objects.vectorize}
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
          {canDownload && selectedObject?.type !== 'group' && (
            <Popover open={sharePopoverOpen} onOpenChange={setSharePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  size='sm'
                  variant='secondary'
                  className='w-full'
                  icon={<TbLink />}
                >
                  {dict.repository.objects.shareLink}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-72' align='start'>
                <div className='space-y-3'>
                  <p className='text-sm font-medium'>
                    {dict.repository.objects.shareLinkExpiryLabel}
                  </p>
                  <RadioGroup
                    value={shareLinkExpiry}
                    onValueChange={setShareLinkExpiry}
                  >
                    {Object.entries(
                      dict.repository.objects.shareLinkExpiryOptions
                    ).map(([value, label]) => (
                      <div key={value} className='flex items-center gap-2'>
                        <RadioGroupItem
                          value={value}
                          id={`share-expiry-${value}`}
                        />
                        <Label htmlFor={`share-expiry-${value}`}>{label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {shareLinkExpiry === 'custom' && (
                    <div className='flex items-center gap-2'>
                      <Input
                        type='number'
                        min={1}
                        value={customHours}
                        onChange={(e) => setCustomHours(e.target.value)}
                        className='h-8'
                      />
                      <span className='text-sm text-muted-foreground'>
                        {dict.repository.objects.shareLinkCustomHours}
                      </span>
                    </div>
                  )}
                  <Button
                    size='sm'
                    className='w-full'
                    onClick={handleShare}
                    loading={generatingShareLink}
                  >
                    {dict.repository.objects.shareLinkGenerate}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
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
              {dict.common.delete}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
