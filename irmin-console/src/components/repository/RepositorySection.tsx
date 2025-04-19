'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
import { useRepository } from '@/context/RepositoryContext';
import { useWorkspace } from '@/context/WorkspaceContext';

import useBaseUrl from '@/hooks/useBaseUrl';

import { IrminAPIBinaryResponse } from '@/types/core/IrminAPIResponse';
import { Object } from '@/types/core/Object';

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
  const searchParams = useSearchParams();

  const { workspace: currentWorkspace } = useWorkspace();

  const {
    immutable,
    currentRef,
    currentRepository,
    uploadObject,
    loadingObjects,
    fetchObject,
    getObjectContent,
  } = useRepository();

  const [currentDirectoryPath, setCurrentDirectoryPath] = useState<string>('');

  const query = useQuery();
  const [queryResultsOpen, setQueryResultsOpen] = useState(false);

  const [selectedObject, setSelectedObject] = useState<Object | undefined>(
    initialSelectedObject
  );
  const [objectContentViewerOpen, setObjectContentViewerOpen] = useState(
    initialObjectContentViewerOpen
  );
  const [objectContent, setObjectContent] = useState<
    IrminAPIBinaryResponse | null | undefined
  >(undefined);
  const objectContentFor = useRef('');

  /**
   * Hook to fetch the content for the object being viewed
   */
  useEffect(() => {
    if (!objectContentViewerOpen) return; // Only fetch content when the viewer is open
    if (!selectedObject) return; // No selected object
    if (objectContentFor.current === selectedObject.path) return; // Already fetched
    objectContentFor.current = selectedObject.path;

    // Empty the content before fetching
    setObjectContent(undefined);

    // Fetch the content for the selected object and update the state
    getObjectContent(selectedObject.path)
      .then((fetchedContent) => {
        setObjectContent(fetchedContent);
      })
      .catch((error) => {
        console.error('Failed to fetch object content', error);
      });
  }, [getObjectContent, selectedObject, objectContentViewerOpen]);

  const [queryField, setQueryField] = useState<string>('');
  const [queryChanged, setQueryChanged] = useState(false);

  /**
   * Set the initial query when the selected object changes.
   * Skip if the query has been changed by the user or if there is no selected object.
   */
  useEffect(() => {
    if (!selectedObject) return;
    if (queryChanged) return;
    if (selectedObject.type != 'structured') return;
    setQueryField(
      `SELECT * FROM $["${currentRepository.slug};${selectedObject.path}${currentRef ? `@${currentRef}` : ''}"] LIMIT 10`
    );
  }, [currentRepository, selectedObject, queryChanged, currentRef]);

  const handleUpload = useCallback(() => {
    irminModal.show(
      dict.repository.objects.uploadObject,
      <UploadObjectModal
        currentRepository={currentRepository.slug}
        currentRef={currentRef ?? 'main'}
        uploadObject={uploadObject}
      />
    );
  }, [dict, irminModal, currentRepository, currentRef, uploadObject]);

  const runCurrentQuery = useCallback(() => {
    if (!queryField || queryField.length < 3) return;
    query.executeSql(queryField);
    setQueryResultsOpen(true);
  }, [queryField, query]);

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
      if (query.loading) return;
      setQueryChanged(true);
      setQueryField(value);
    },
    [query.loading]
  );

  return (
    <>
      <div className='relative container mx-auto mb-4 flex max-w-7xl flex-col px-2 md:px-4'>
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
              loading={query.loading}
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
        {!queryResultsOpen ? (
          <>
            <div className='my-4 flex w-full flex-wrap items-center justify-between gap-4'>
              <div className='inline max-w-full overflow-x-scroll text-xs whitespace-nowrap text-gray-600 lg:text-sm dark:text-gray-400'>
                <Link
                  className='transition-all hover:text-gray-800 hover:underline dark:hover:text-gray-200'
                  href={`${workspaceUrl}/repositories`}
                >
                  {currentWorkspace?.slug}
                </Link>
                {' / '}
                <Link
                  className='transition-all hover:text-gray-800 hover:underline dark:hover:text-gray-200'
                  href={`${workspaceUrl}/repositories/${currentRepository.slug}`}
                >
                  {currentRepository.slug}
                </Link>
                {currentRef && ` @ ${currentRef}`}
              </div>
              <div className='flex items-center gap-2'>
                <ButtonWithTooltip
                  variant='secondary'
                  size='icon'
                  icon={<TbRefresh />}
                  tooltip={dict.common.refresh}
                  disabled={loadingObjects}
                  onClick={() => fetchObject()}
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
                <Button
                  variant='secondary'
                  size='sm'
                  icon={<TbDownload />}
                  href={`${workspaceUrl}/repositories/${currentRepository.slug}/download?ref=${currentRef}`}
                >
                  {dict.common.actions.download}
                </Button>
                {!immutable && (
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
              icon={<TbChevronUp className='text-xl' />}
            >
              {dict.common.close} {dict.query.queryResults}
            </Button>
          </div>
        )}
      </div>
      {query.result && queryResultsOpen && (
        <div className='flex h-[calc(100vh-400px)] min-h-96'>
          <QueryResults
            title={dict.query.queryResults}
            result={query.result}
            loading={query.loading}
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
                {objectContent ? (
                  <div className='bg-background w-full rounded'>
                    <ObjectViewer
                      object={selectedObject}
                      objectContent={objectContent}
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
