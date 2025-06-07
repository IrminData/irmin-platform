'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { AiOutlinePlayCircle } from 'react-icons/ai';
import { IoClose } from 'react-icons/io5';
import {
  TbChevronUp,
  TbDownload,
  TbFileDiff,
  TbRefresh,
  TbUpload,
} from 'react-icons/tb';

import CodeMirrorEditor from '@/components/editor/ide/CodeMirrorEditor';
import QueryResults from '@/components/query/QueryResults';
import Button, { ButtonWithTooltip } from '@/components/ui/button';
import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useLocale } from '@/context/LocaleContext';
import { usePopup } from '@/context/PopupContext';
import { useQuery } from '@/context/QueryContext';
import { useRepositoryContext } from '@/context/RepositoryContext';
import { useWorkspaceContext } from '@/context/WorkspaceContext';

import useBaseUrl from '@/hooks/useBaseUrl';
import { useRepositoryObject } from '@/hooks/useRepositoryObject';
import { useRepositoryObjectContent } from '@/hooks/useRepositoryObjectContent';
import { useResourceAllowed } from '@/hooks/useResourceAllowed';

import { Object } from '@/types/core/Object';
import { PolicyAction, PolicyResource } from '@/types/core/Policy';

import ObjectDetails from './objects/ObjectDetails';
import ObjectList from './objects/ObjectList';
import ObjectViewer from './objects/ObjectViewer';
import UploadObjectModal from './objects/UploadObjectModal';

/**
 * Repository viewer section, provides UI for the Repository viewer Page.
 *
 * @param props - The component props
 * @param props.initialSelectedObject - The initial selected object to display
 * @param props.initialObjectContentViewerOpen - Whether the object content viewer should be open initially
 * @returns The repository section component
 */
export default function RepositorySection({
  initialSelectedObject,
  initialObjectContentViewerOpen = false,
}: {
  initialSelectedObject?: Object;
  initialObjectContentViewerOpen?: boolean;
}) {
  const { irminModal } = usePopup();
  const { dict } = useLocale();
  const { isResourceAllowed } = useResourceAllowed();
  const searchParams = useSearchParams();
  const { workspaceSlug } = useWorkspaceContext();

  const { immutable, currentRef, repository } = useRepositoryContext();

  const [currentDirectoryPath, setCurrentDirectoryPath] = useState<string>('');

  const { executeSql, loading: queryLoading, result: queryResult } = useQuery();
  const [queryResultsOpen, setQueryResultsOpen] = useState(false);

  const [selectedObject, setSelectedObject] = useState<Object | undefined>(
    initialSelectedObject
  );

  const { repositoryObjectQuery, uploadObjectMutation } = useRepositoryObject(
    repository.slug,
    currentRef,
    selectedObject?.path
  );

  const { repositoryObjectContentQuery, downloadObjectAsZipMutation } =
    useRepositoryObjectContent(
      repository.slug,
      currentRef,
      selectedObject?.path
    );

  const [objectContentViewerOpen, setObjectContentViewerOpen] = useState(
    initialObjectContentViewerOpen
  );

  const [queryField, setQueryField] = useState<string>('');
  const [queryChanged, setQueryChanged] = useState(false);

  const canViewRepository = useMemo(
    () =>
      isResourceAllowed(
        PolicyResource.Repository,
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

  const canDownload = useMemo(
    () =>
      isResourceAllowed(
        PolicyResource.RepositoryObject,
        PolicyAction.Read,
        repository.id
      ),
    [isResourceAllowed, repository.id]
  );

  const canQuery = useMemo(
    () =>
      isResourceAllowed(
        PolicyResource.RepositoryObject,
        PolicyAction.Read,
        repository.id
      ),
    [isResourceAllowed, repository.id]
  );

  /**
   * Set the initial query when the selected object changes.
   * Skip if the query has been changed by the user or if there is no selected object.
   */
  useEffect(() => {
    if (!selectedObject) return;
    if (queryChanged) return;
    if (selectedObject.type != 'structured') return;
    setQueryField(
      `SELECT * FROM $["${repository.slug};${selectedObject.path}${currentRef ? `@${currentRef}` : ''}"] LIMIT 10`
    );
  }, [repository, selectedObject, queryChanged, currentRef]);

  const handleUpload = useCallback(() => {
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
      />
    );
  }, [dict, irminModal, repository, currentRef, uploadObjectMutation]);

  const runCurrentQuery = useCallback(() => {
    if (!queryField || queryField.length < 3) return;
    executeSql(queryField);
    setQueryResultsOpen(true);
  }, [queryField, executeSql]);

  /** The base URL for the repository, eg. /en/workspace/workspace-slug/repositories/repository-slug */
  const baseUrl = useBaseUrl({
    pathname: '',
    segment: 'repositories',
    includeSegment: true,
    segmentsAfter: 1,
  });

  // The base URL for the workspace, eg. /en/workspace/workspace-slug
  const workspaceUrl = useBaseUrl({
    pathname: '',
    segment: 'workspace',
    includeSegment: true,
    segmentsAfter: 1,
  });

  const updateQuery = useCallback(
    (value: string) => {
      if (queryLoading) return;
      setQueryChanged(true);
      setQueryField(value);
    },
    [queryLoading]
  );

  if (!canViewRepository) {
    return (
      <div className='relative container mx-auto max-w-7xl'>
        <div className='my-4 flex flex-col gap-4 p-4'>
          <p className='text-sm opacity-60'>{dict.common.error}</p>
          <p className='text-sm opacity-60'>
            {dict.common.insufficientPermissions}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className='relative container mx-auto mb-4 flex max-w-7xl flex-col px-2 md:px-4'>
        {canQuery && (
          <div className='bg-background w-full max-w-full overflow-hidden rounded-md border border-gray-100 dark:border-gray-800'>
            <div className='flex w-full flex-row items-center justify-between bg-gray-100 pl-4 dark:bg-gray-800'>
              <div className='py-2 text-sm font-semibold'>
                {dict.repository.sqlQuery}
              </div>
              <Button
                variant='accent'
                className='float-end m-2 shadow-none'
                size='sm'
                icon={<AiOutlinePlayCircle />}
                loading={queryLoading}
                onClick={runCurrentQuery}
              >
                {dict.repository.runQuery}
              </Button>
            </div>
            <CodeMirrorEditor
              language='sql'
              content={queryField}
              updateEditorContent={updateQuery}
            />
          </div>
        )}
        {!queryResultsOpen ? (
          <>
            <div className='my-4 flex w-full flex-wrap items-center justify-between gap-4'>
              <div className='inline max-w-full overflow-x-scroll text-xs whitespace-nowrap text-gray-600 lg:text-sm dark:text-gray-400'>
                <Link
                  className='transition-all hover:text-gray-800 hover:underline dark:hover:text-gray-200'
                  href={`${workspaceUrl}/repositories`}
                >
                  {workspaceSlug}
                </Link>
                {' / '}
                <Link
                  className='transition-all hover:text-gray-800 hover:underline dark:hover:text-gray-200'
                  href={`${workspaceUrl}/repositories/${repository.slug}`}
                >
                  {repository.slug}
                </Link>
                {currentRef && ` @ ${currentRef}`}
              </div>
              <div className='flex items-center gap-2'>
                <ButtonWithTooltip
                  variant='secondary'
                  size='icon'
                  icon={<TbRefresh />}
                  tooltip={dict.common.refresh}
                  disabled={repositoryObjectQuery.isLoading}
                  onClick={() => repositoryObjectQuery.refetch()}
                />
                {!immutable && (
                  <Button
                    variant='secondary'
                    size='sm'
                    href={`${baseUrl}/uncommitted-changes?${searchParams.toString()}`}
                    icon={<TbFileDiff />}
                  >
                    {dict.repository.commit.uncommittedChanges}
                  </Button>
                )}
                {canDownload && (
                  <Button
                    variant='secondary'
                    size='sm'
                    icon={<TbDownload />}
                    onClick={() => {
                      downloadObjectAsZipMutation.mutate({
                        path: currentDirectoryPath,
                        ref: currentRef ?? '',
                      });
                    }}
                    loading={downloadObjectAsZipMutation.isPending}
                  >
                    {dict.common.download}
                  </Button>
                )}
                {!immutable && canUpload && (
                  <Button
                    variant='default'
                    size='sm'
                    onClick={handleUpload}
                    icon={<TbUpload />}
                  >
                    {dict.repository.objects.uploadObject}
                  </Button>
                )}
              </div>
            </div>
            <div className='flex w-full flex-col items-start gap-2 md:flex-row md:gap-2'>
              <ObjectList
                selectObject={setSelectedObject}
                currentPath={currentDirectoryPath}
                setCurrentPath={setCurrentDirectoryPath}
              />
              <ObjectDetails
                selectedObject={selectedObject}
                closeDetails={() => setSelectedObject(undefined)}
                viewObject={() => setObjectContentViewerOpen(true)}
                setCurrentPath={setCurrentDirectoryPath}
              />
            </div>
          </>
        ) : (
          <div className='mt-4'>
            <Button
              variant='gray'
              size='sm'
              className='w-full text-pretty capitalize'
              onClick={() => setQueryResultsOpen(false)}
              icon={<TbChevronUp size={22} />}
            >
              {dict.common.close} {dict.query.queryResults}
            </Button>
          </div>
        )}
      </div>
      {queryResult && queryResultsOpen && (
        <div className='flex h-[calc(100vh-400px)] min-h-96'>
          <QueryResults
            title={dict.query.queryResults}
            result={queryResult}
            loading={queryLoading}
          />
        </div>
      )}
      {objectContentViewerOpen && !queryResultsOpen && selectedObject && (
        <div
          id='object-content-modal'
          className='animate-fadeIn bg-background/30 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[2px]'
        >
          <div className='w-full max-w-[90vw]'>
            <div className='border-border bg-popover rounded-lg border shadow-lg'>
              <div className='flex flex-row items-center justify-between border-b px-4 pt-4 pb-2 dark:border-b-gray-800'>
                <h2 className='text-lg font-normal'>{selectedObject.path}</h2>
                <ButtonWithTooltip
                  size='icon'
                  variant='ghost'
                  className='ml-4 rounded-full'
                  onClick={() => setObjectContentViewerOpen(false)}
                  aria-label={dict.common.close}
                  tooltip={dict.common.close}
                  icon={<IoClose size={24} />}
                />
              </div>
              <div className='relative max-h-[calc(100vh-200px)] overflow-scroll px-0 pt-0'>
                {repositoryObjectContentQuery.data ? (
                  <div className='bg-background w-full rounded'>
                    <ObjectViewer
                      object={selectedObject}
                      objectContent={repositoryObjectContentQuery.data}
                    />
                  </div>
                ) : (
                  <LoadingSkeleton className='h-96 w-full' />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
